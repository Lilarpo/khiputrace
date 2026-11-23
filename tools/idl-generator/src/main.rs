use anchor_lang_idl::build::IdlBuilder;
use anyhow::Result;
use std::{fs, path::PathBuf};

fn main() -> Result<()> {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()?;
    let idl = IdlBuilder::new()
        .program_path(root.join("programs/khiputrace"))
        .cargo_args(vec!["--locked".into(), "-j".into(), "2".into()])
        .build()?;
    let output = root.join("target/idl");
    fs::create_dir_all(&output)?;
    fs::write(
        output.join("khiputrace.json"),
        format!("{}\n", serde_json::to_string_pretty(&idl)?),
    )?;
    Ok(())
}
