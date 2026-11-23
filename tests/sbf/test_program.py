"""Transacciones firmadas contra el ELF SBF en LiteSVM, sin RPC ni claves en disco."""

from dataclasses import dataclass, replace
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import unittest

from solders.account import Account
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.litesvm import LiteSVM
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.transaction_metadata import FailedTransactionMetadata

ROOT = Path(__file__).resolve().parents[2]
PROGRAM_ID = Pubkey.from_string(re.search(r'declare_id!\("([^"]+)"\)', (ROOT / "programs/khiputrace/src/lib.rs").read_text())[1])
SYSTEM_ID = Pubkey.default()
ARTIFACT = Path(os.environ.get("KHIPUTRACE_SBF", ROOT / "target/sbf/khiputrace.so"))
TRANSACTIONS: list[dict] = []
RESULTS: list[dict] = []
MAX_U64 = (1 << 64) - 1


def discriminator(namespace: str, name: str) -> bytes:
    return hashlib.sha256(f"{namespace}:{name}".encode()).digest()[:8]


def text(value: str) -> bytes:
    raw = value.encode("utf-8")
    return struct.pack("<I", len(raw)) + raw


def audit_address(authority: Pubkey, audit_id: int) -> Pubkey:
    return Pubkey.find_program_address([b"audit", bytes(authority), struct.pack("<Q", audit_id)], PROGRAM_ID)[0]


def finding_address(audit: Pubkey, finding_id: int) -> Pubkey:
    return Pubkey.find_program_address([b"finding", bytes(audit), struct.pack("<Q", finding_id)], PROGRAM_ID)[0]


class Reader:
    def __init__(self, raw: bytes, name: str):
        if raw[:8] != discriminator("account", name):
            raise ValueError(f"Discriminator incorrecto para {name}")
        self.raw, self.offset = raw, 8

    def take(self, count: int) -> bytes:
        result = self.raw[self.offset:self.offset + count]
        if len(result) != count:
            raise ValueError("Datos truncados")
        self.offset += count
        return result

    def integer(self, size: int) -> int:
        return int.from_bytes(self.take(size), "little")

    def string(self) -> str:
        return self.take(self.integer(4)).decode("utf-8")


@dataclass(frozen=True)
class AuditData:
    version: int
    authority: Pubkey
    audit_id: int
    title: str
    next_id: int
    active: int
    opened: int
    bump: int

    def encode(self) -> bytes:
        raw = discriminator("account", "Audit") + bytes([self.version]) + bytes(self.authority) + struct.pack("<Q", self.audit_id) + text(self.title) + struct.pack("<QQQB", self.next_id, self.active, self.opened, self.bump)
        return raw.ljust(174, b"\0")


@dataclass(frozen=True)
class FindingData:
    version: int
    audit: Pubkey
    finding_id: int
    severity: int
    status: int
    title: str
    description: str
    note: str
    bump: int


class ProgramTests(unittest.TestCase):
    def setUp(self) -> None:
        self.svm = LiteSVM().with_sigverify(True).with_blockhash_check(True)
        self.svm.add_program(PROGRAM_ID, ARTIFACT.read_bytes())
        self.sponsor, self.authority, self.attacker = Keypair(), Keypair(), Keypair()
        for wallet in [self.sponsor, self.authority, self.attacker]:
            result = self.svm.airdrop(wallet.pubkey(), 1_000_000_000)
            self.assertNotIsInstance(result, FailedTransactionMetadata)
        self.watched: set[Pubkey] = {self.authority.pubkey(), self.attacker.pubkey()}

    def tearDown(self) -> None:
        result = self._outcome.result
        failures = result.failures + result.errors
        RESULTS.append({"test": self.id(), "passed": not any(case.id().startswith(self.id()) for case, _ in failures)})

    def snapshot(self) -> dict:
        return {str(key): None if (account := self.svm.get_account(key)) is None else account.to_json() for key in sorted(self.watched, key=str)}

    def send(self, instructions: list[Instruction], actor: Keypair, expected: tuple[int, str] | None = None, error_index: int = 0) -> None:
        before = self.snapshot()
        self.svm.expire_blockhash()  # Cada intento llega al programa, sin rechazos por replay.
        signers = [self.sponsor] if actor.pubkey() == self.sponsor.pubkey() else [self.sponsor, actor]
        transaction = Transaction.new_signed_with_payer(instructions, self.sponsor.pubkey(), signers, self.svm.latest_blockhash())
        result = self.svm.send_transaction(transaction)
        raw = json.loads(result.to_json())
        failed = isinstance(result, FailedTransactionMetadata)
        metadata = raw["meta"] if failed else raw
        record = {"test": self.id(), "expected_error": None if expected is None else expected[1], "error": raw.get("err"), "signature": metadata["signature"], "logs": metadata["logs"], "compute_units": metadata["compute_units_consumed"]}
        after = self.snapshot()
        record["state_before"] = before
        record["state_after"] = after
        TRANSACTIONS.append(record)
        if expected is None:
            self.assertFalse(failed, json.dumps(record, ensure_ascii=False))
            return
        self.assertTrue(failed, "La operación que debía rechazarse se aceptó")
        self.assertEqual(raw["err"], {"InstructionError": [error_index, {"Custom": expected[0]}]}, json.dumps(record, ensure_ascii=False))
        self.assertTrue(any(line.startswith(f"Program {PROGRAM_ID} invoke") for line in metadata["logs"]))
        self.assertTrue(any(line.startswith(f"Program {PROGRAM_ID} failed") for line in metadata["logs"]))
        self.assertTrue(any(f"Error Code: {expected[1]}." in line for line in metadata["logs"]), json.dumps(record, ensure_ascii=False))
        record["state_unchanged"] = before == after
        record["state_before_sha256"] = hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest()
        record["state_after_sha256"] = hashlib.sha256(json.dumps(after, sort_keys=True).encode()).hexdigest()
        record["accounts_checked"] = sorted(before)
        self.assertEqual(after, before, "Cambió el estado del negocio tras el rechazo")

    def create_audit_ix(self, audit_id: int, title: str = "Auditoría sintética", address: Pubkey | None = None) -> Instruction:
        audit = address or audit_address(self.authority.pubkey(), audit_id)
        self.watched.add(audit)
        return Instruction(PROGRAM_ID, discriminator("global", "create_audit") + struct.pack("<Q", audit_id) + text(title), [AccountMeta(self.authority.pubkey(), True, True), AccountMeta(audit, False, True), AccountMeta(SYSTEM_ID, False, False)])

    def create_audit(self, audit_id: int = 42) -> Pubkey:
        self.send([self.create_audit_ix(audit_id)], self.authority)
        return audit_address(self.authority.pubkey(), audit_id)

    def create_finding_ix(self, audit: Pubkey, finding_id: int, actor: Keypair | None = None, title: str = "Hallazgo sintético", description: str = "Descripción de práctica", address: Pubkey | None = None) -> Instruction:
        actor = actor or self.authority
        finding = address or finding_address(audit, finding_id)
        self.watched.add(finding)
        payload = struct.pack("<Q", finding_id) + text(title) + text(description) + bytes([2])
        return Instruction(PROGRAM_ID, discriminator("global", "create_finding") + payload, [AccountMeta(actor.pubkey(), True, True), AccountMeta(audit, False, True), AccountMeta(finding, False, True), AccountMeta(SYSTEM_ID, False, False)])

    def create_finding(self, audit: Pubkey, finding_id: int = 0) -> Pubkey:
        self.send([self.create_finding_ix(audit, finding_id)], self.authority)
        return finding_address(audit, finding_id)

    def mutation(self, name: str, audit: Pubkey, finding: Pubkey, actor: Keypair | None = None, title: str = "Título corregido", description: str = "Descripción corregida", note: str = "Corrección aplicada") -> Instruction:
        actor = actor or self.authority
        payload = text(title) + text(description) + bytes([3]) if name == "update_finding" else text(note) if name == "resolve_finding" else b""
        return Instruction(PROGRAM_ID, discriminator("global", name) + payload, [AccountMeta(actor.pubkey(), True, name == "close_finding"), AccountMeta(audit, False, name != "update_finding"), AccountMeta(finding, False, True)])

    def audit(self, address: Pubkey) -> AuditData:
        account = self.svm.get_account(address)
        self.assertIsNotNone(account)
        self.assertEqual(account.owner, PROGRAM_ID)
        self.assertEqual(len(account.data), 174)
        r = Reader(account.data, "Audit")
        return AuditData(r.integer(1), Pubkey.from_bytes(r.take(32)), r.integer(8), r.string(), r.integer(8), r.integer(8), r.integer(8), r.integer(1))

    def finding(self, address: Pubkey) -> FindingData:
        account = self.svm.get_account(address)
        self.assertIsNotNone(account)
        self.assertEqual(account.owner, PROGRAM_ID)
        self.assertEqual(len(account.data), 1184)
        r = Reader(account.data, "Finding")
        return FindingData(r.integer(1), Pubkey.from_bytes(r.take(32)), r.integer(8), r.integer(1), r.integer(1), r.string(), r.string(), r.string(), r.integer(1))

    def inject_audit_boundary(self, address: Pubkey, **changes: int) -> None:
        # Solo el harness privilegiado de la VM prepara límites u64 inalcanzables
        # en una práctica normal; esto no es una operación del programa.
        account = self.svm.get_account(address)
        model = replace(self.audit(address), **changes)
        self.svm.set_account(address, Account(account.lamports, model.encode(), account.owner, account.executable, account.rent_epoch))

    def test_complete_lifecycle_reads_counters_refund_and_monotonic_ids(self) -> None:
        audit = self.create_audit()
        model = self.audit(audit)
        self.assertEqual((model.authority, model.audit_id, model.next_id, model.active, model.opened), (self.authority.pubkey(), 42, 0, 0, 0))
        self.assertEqual(model.bump, Pubkey.find_program_address([b"audit", bytes(self.authority.pubkey()), struct.pack("<Q", 42)], PROGRAM_ID)[1])
        self.assertEqual((model.version, model.title), (1, "Auditoría sintética"))
        finding = self.create_finding(audit)
        self.assertEqual((self.finding(finding).audit, self.finding(finding).status, self.finding(finding).note), (audit, 0, ""))
        self.assertEqual((self.finding(finding).version, self.finding(finding).finding_id, self.finding(finding).title, self.finding(finding).description, self.finding(finding).severity), (1, 0, "Hallazgo sintético", "Descripción de práctica", 2))
        self.assertEqual(self.finding(finding).bump, Pubkey.find_program_address([b"finding", bytes(audit), struct.pack("<Q", 0)], PROGRAM_ID)[1])
        self.assertEqual((self.audit(audit).next_id, self.audit(audit).active, self.audit(audit).opened), (1, 1, 1))
        self.send([self.mutation("update_finding", audit, finding)], self.authority)
        self.assertEqual((self.finding(finding).title, self.finding(finding).severity), ("Título corregido", 3))
        self.assertEqual(self.finding(finding).description, "Descripción corregida")
        self.assertEqual((self.audit(audit).next_id, self.audit(audit).active, self.audit(audit).opened), (1, 1, 1))
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority)
        self.assertEqual((self.finding(finding).status, self.finding(finding).note), (1, "Corrección aplicada"))
        self.assertEqual((self.audit(audit).active, self.audit(audit).opened), (1, 0))
        refund = self.svm.get_balance(finding)
        balance = self.svm.get_balance(self.authority.pubkey())
        self.send([self.mutation("close_finding", audit, finding)], self.authority)
        closed = self.svm.get_account(finding)
        self.assertTrue(closed is None or (closed.lamports == 0 and closed.data == b"" and closed.owner == SYSTEM_ID))
        self.assertEqual(self.svm.get_balance(self.authority.pubkey()), balance + refund)
        self.assertEqual((self.audit(audit).next_id, self.audit(audit).active, self.audit(audit).opened), (1, 0, 0))
        following = self.create_finding(audit, 1)
        self.assertNotEqual(following, finding)
        self.assertEqual(self.finding(following).finding_id, 1)
        self.assertEqual((self.audit(audit).next_id, self.audit(audit).active, self.audit(audit).opened), (2, 1, 1))

    def test_unauthorized_wallet_rejected_for_all_finding_mutations(self) -> None:
        audit = self.create_audit()
        self.send([self.create_finding_ix(audit, 0, self.attacker)], self.attacker, (6000, "Unauthorized"))
        finding = self.create_finding(audit)
        for name in ["update_finding", "resolve_finding", "close_finding"]:
            with self.subTest(name=name):
                self.send([self.mutation(name, audit, finding, self.attacker)], self.attacker, (6000, "Unauthorized"))

    def test_foreign_audit_combination_rejected_by_program(self) -> None:
        audit, other = self.create_audit(42), self.create_audit(43)
        finding = self.create_finding(audit)
        for name in ["update_finding", "resolve_finding", "close_finding"]:
            with self.subTest(name=name):
                self.send([self.mutation(name, other, finding)], self.authority, (2006, "ConstraintSeeds"))

    def test_incorrect_creation_pdas_rejected(self) -> None:
        audit = self.create_audit()
        self.send([self.create_audit_ix(43, address=audit)], self.authority, (2006, "ConstraintSeeds"))
        finding = self.create_finding(audit)
        self.send([self.create_finding_ix(audit, 1, address=finding)], self.authority, (2006, "ConstraintSeeds"))

    def test_invalid_or_oversized_fields_rejected_after_init_and_update(self) -> None:
        for number, title in enumerate(["", " \n\t ", "x" * 97, "é" * 49], 100):
            with self.subTest(title_bytes=len(title.encode())):
                self.send([self.create_audit_ix(number, title)], self.authority, (6002, "InvalidText"))
        audit = self.create_audit()
        for title, description in [("", "Descripción"), ("Título", ""), ("Título", "x" * 513), ("é" * 49, "Descripción")]:
            with self.subTest(operation="create", title=title[:5], description_bytes=len(description.encode())):
                self.send([self.create_finding_ix(audit, 0, title=title, description=description)], self.authority, (6002, "InvalidText"))
        finding = self.create_finding(audit)
        for title, description in [("", "Descripción"), ("Título", "x" * 513), ("é" * 49, "Descripción")]:
            with self.subTest(operation="update"):
                self.send([self.mutation("update_finding", audit, finding, title=title, description=description)], self.authority, (6002, "InvalidText"))

    def test_resolved_finding_cannot_be_updated_or_resolved_twice(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority)
        for name in ["update_finding", "resolve_finding"]:
            with self.subTest(name=name):
                self.send([self.mutation(name, audit, finding)], self.authority, (6003, "InvalidTransition"))

    def test_invalid_remediation_keeps_finding_open_and_counters_intact(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        for note, code, symbol in [("", 6004, "CorrectiveActionRequired"), ("  \n ", 6004, "CorrectiveActionRequired"), ("x" * 9, 6004, "CorrectiveActionRequired"), ("🦙" * 9, 6004, "CorrectiveActionRequired"), ("x" * 513, 6002, "InvalidText")]:
            with self.subTest(note_bytes=len(note.encode())):
                self.send([self.mutation("resolve_finding", audit, finding, note=note)], self.authority, (code, symbol))
        self.assertEqual((self.finding(finding).status, self.audit(audit).opened), (0, 1))

    def test_valid_unicode_note_boundaries(self) -> None:
        audit = self.create_audit()
        for finding_id, note in enumerate(["x" * 10, "é" * 10, "🦙" * 10, "é" * 256]):
            finding = self.create_finding(audit, finding_id)
            self.send([self.mutation("resolve_finding", audit, finding, note="  " + note + "  ")], self.authority)
            self.assertEqual(self.finding(finding).note, note)
        self.assertEqual((self.audit(audit).active, self.audit(audit).opened), (4, 0))

    def test_open_finding_cannot_close_and_closed_id_cannot_reinitialize(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        self.send([self.mutation("close_finding", audit, finding)], self.authority, (6005, "FindingNotResolved"))
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority)
        self.send([self.mutation("close_finding", audit, finding)], self.authority)
        self.send([self.create_finding_ix(audit, 0)], self.authority, (6008, "UnexpectedFindingId"))
        self.assertEqual((self.audit(audit).next_id, self.audit(audit).active, self.audit(audit).opened), (1, 0, 0))

    def test_counter_overflow_and_underflow_return_program_errors(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        self.inject_audit_boundary(audit, next_id=MAX_U64)
        self.send([self.create_finding_ix(audit, MAX_U64)], self.authority, (6006, "CounterOverflow"))
        self.inject_audit_boundary(audit, next_id=1, opened=0)
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority, (6007, "CounterUnderflow"))
        self.inject_audit_boundary(audit, opened=2)
        self.send([self.mutation("update_finding", audit, finding)], self.authority, (6009, "InvalidCounters"))

    def test_wrong_account_owner_is_rejected(self) -> None:
        audit = self.create_audit()
        self.send([self.mutation("update_finding", audit, self.attacker.pubkey())], self.authority, (3007, "AccountOwnedByWrongProgram"))

    def test_missing_authority_signature_rejected_by_all_contexts(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        instructions = [self.create_audit_ix(43), self.create_finding_ix(audit, 1)]
        instructions += [self.mutation(name, audit, finding) for name in ["update_finding", "resolve_finding", "close_finding"]]
        for instruction in instructions:
            with self.subTest(discriminator=bytes(instruction.data[:8]).hex()):
                accounts = list(instruction.accounts)
                accounts[0] = AccountMeta(self.authority.pubkey(), False, accounts[0].is_writable)
                unsigned = Instruction(PROGRAM_ID, instruction.data, accounts)
                self.send([unsigned], self.sponsor, (3010, "AccountNotSigner"))

    def test_invalid_severity_rejected_during_instruction_deserialization(self) -> None:
        audit = self.create_audit()
        create = self.create_finding_ix(audit, 0)
        self.send([Instruction(PROGRAM_ID, bytes(create.data[:-1]) + b"\xff", create.accounts)], self.authority, (102, "InstructionDidNotDeserialize"))
        finding = self.create_finding(audit)
        update = self.mutation("update_finding", audit, finding)
        self.send([Instruction(PROGRAM_ID, bytes(update.data[:-1]) + b"\xff", update.accounts)], self.authority, (102, "InstructionDidNotDeserialize"))

    def test_stored_bump_and_schema_version_are_validated(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        original_bump = self.audit(audit).bump
        self.inject_audit_boundary(audit, bump=(original_bump + 1) % 256)
        self.send([self.mutation("update_finding", audit, finding)], self.authority, (6011, "InvalidBump"))
        self.inject_audit_boundary(audit, bump=original_bump, version=2)
        self.send([self.mutation("update_finding", audit, finding)], self.authority, (6012, "UnsupportedVersion"))

    def test_refund_overflow_is_rejected_before_close(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority)
        actor = self.svm.get_account(self.authority.pubkey())
        self.svm.set_account(self.authority.pubkey(), Account(MAX_U64, actor.data, actor.owner, actor.executable, actor.rent_epoch))
        self.send([self.mutation("close_finding", audit, finding)], self.authority, (6006, "CounterOverflow"))

    def test_later_instruction_failure_rolls_back_resolution(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        instructions = [self.mutation("resolve_finding", audit, finding), self.mutation("update_finding", audit, finding)]
        self.send(instructions, self.authority, (6003, "InvalidTransition"), error_index=1)
        self.assertEqual((self.finding(finding).status, self.audit(audit).opened), (0, 1))

    def test_later_failure_rolls_back_physical_close_and_refund(self) -> None:
        audit = self.create_audit()
        finding = self.create_finding(audit)
        self.send([self.mutation("resolve_finding", audit, finding)], self.authority)
        instructions = [self.mutation("close_finding", audit, finding), self.create_finding_ix(audit, 0)]
        self.send(instructions, self.authority, (6008, "UnexpectedFindingId"), error_index=1)
        self.assertEqual((self.finding(finding).status, self.audit(audit).active), (1, 1))


def tearDownModule() -> None:
    sources = hashlib.sha256()
    for path in sorted((ROOT / "programs/khiputrace/src").rglob("*.rs")):
        sources.update(str(path.relative_to(ROOT)).encode() + b"\0" + path.read_bytes())
    report = {"executed_at_utc": datetime.now(timezone.utc).isoformat(), "runtime": "LiteSVM local mediante solders 0.26.0; sin RPC", "program_id": str(PROGRAM_ID), "artifact_sha256": hashlib.sha256(ARTIFACT.read_bytes()).hexdigest(), "source_sha256": sources.hexdigest(), "test_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "cases": RESULTS, "transactions": TRANSACTIONS}
    prefix = os.environ.get("KHIPUTRACE_EVIDENCE_PREFIX", "1.3")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", prefix):
        raise ValueError("Prefijo de evidencia inválido")
    output = ROOT / f"docs/evidence/{prefix}-sbf-transactions.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
