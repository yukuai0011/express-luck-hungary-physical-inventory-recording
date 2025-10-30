#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_barcode_scanner::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
