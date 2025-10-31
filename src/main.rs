use dioxus::prelude::*;
use gloo_storage::{LocalStorage, Storage};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
struct Profile {
    api_endpoint: String,
    order_no: String,
    recording_no: i64,
    location_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    bearer_token: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Payload {
    orderNo: String,
    recordingNo: i64,
    locationCode: String,
    packageNo: String,
    quantity: i64,
    packageIntact: bool,
}

const PROFILE_KEY: &str = "inventoryProfile";

fn main() {
    console_error_panic_hook::set_once();
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let current_tab = use_signal(|| 0usize); // 0 profile, 1 work

    rsx! {
        style { [include_str!("../assets/style.css")] }
        div { class: "app",
            header { class: "header",
                h1 { "Inventory Scanner" }
                p { class: "subtitle", "Rust + Dioxus mobile app" }
            }
            nav { class: "tabs",
                button { class: if *current_tab.read() == 0 {"tab active"} else {"tab"}, onclick: move |_| current_tab.set(0), "Profile" }
                button { class: if *current_tab.read() == 1 {"tab active"} else {"tab"}, onclick: move |_| current_tab.set(1), "Work" }
            }
            main { class: "main",
                match *current_tab.read() {
                    0 => rsx!{ ProfileView{} },
                    _ => rsx!{ WorkView{} },
                }
            }
        }
        // ZXing bridge for scanning
        script { [include_str!("../assets/scan.js")] }
    }
}

fn load_profile() -> Option<Profile> {
    LocalStorage::get(PROFILE_KEY).ok()
}

fn save_profile(p: &Profile) {
    let _ = LocalStorage::set(PROFILE_KEY, p);
}

fn clear_profile() { let _ = LocalStorage::delete(PROFILE_KEY); }

#[component]
fn ProfileView() -> Element {
    let scanned_api = use_signal(|| String::new());
    let scanned_info = use_signal(|| (String::new(), String::new(), 0i64)); // (order, location, recording)
    let bearer = use_signal(|| String::new());

    let summary = use_memo(move || {
        if let Some(p) = load_profile(){
            let safe = serde_json::json!({
                "apiEndpoint": p.api_endpoint,
                "orderNo": p.order_no,
                "recordingNo": p.recording_no,
                "locationCode": p.location_code,
                "bearerToken": if p.bearer_token.is_some() {"(stored)"} else {"(none)"}
            });
            serde_json::to_string_pretty(&safe).unwrap_or_default()
        } else {
            "No profile saved.".to_string()
        }
    });

    let can_save = use_memo(move || !scanned_api.read().is_empty() && !scanned_info.read().0.is_empty() && !scanned_info.read().1.is_empty());

    let scan_qr = move |_| {
        spawn(async move {
            match scan_code_js("qr").await {
                Ok(text) => {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                        if v.get("apiEndpoint").is_some() {
                            if let Some(s) = v.get("apiEndpoint").and_then(|x| x.as_str()) {
                                scanned_api.set(s.trim_matches(['<','>']).to_string());
                            }
                        } else {
                            let order = v.get("orderNo").and_then(|x| x.as_str()).unwrap_or("").to_string();
                            let loc = v.get("locationCode").and_then(|x| x.as_str()).unwrap_or("").to_string();
                            let rec = v.get("recordingNo").and_then(|x| x.as_i64()).unwrap_or(0);
                            if !order.is_empty() && !loc.is_empty() && rec != 0 {
                                scanned_info.set((order, loc, rec));
                            }
                        }
                    }
                }
                Err(e) => {
                    web_log(&format!("Scan error: {}", e));
                }
            }
        });
    };

    let detect_paste = move |evt: Event<FormData>| {
        if let Some(val) = evt.values.get("paste"){
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&val) {
                if v.get("apiEndpoint").is_some() {
                    if let Some(s) = v.get("apiEndpoint").and_then(|x| x.as_str()) {
                        scanned_api.set(s.trim_matches(['<','>']).to_string());
                    }
                } else {
                    let order = v.get("orderNo").and_then(|x| x.as_str()).unwrap_or("").to_string();
                    let loc = v.get("locationCode").and_then(|x| x.as_str()).unwrap_or("").to_string();
                    let rec = v.get("recordingNo").and_then(|x| x.as_i64()).unwrap_or(0);
                    if !order.is_empty() && !loc.is_empty() && rec != 0 {
                        scanned_info.set((order, loc, rec));
                    }
                }
            }
        }
    };

    let save = move |_| {
        if !*can_save.read() { return; }
        let p = Profile{
            api_endpoint: scanned_api.read().clone(),
            order_no: scanned_info.read().0.clone(),
            recording_no: scanned_info.read().2,
            location_code: scanned_info.read().1.clone(),
            bearer_token: if bearer.read().is_empty(){ None } else { Some(bearer.read().clone()) }
        };
        save_profile(&p);
    };

    let clear = move |_| { clear_profile(); };

    rsx! {
        section { class: "card",
            h2 { "1) Recording Profile" }
            p { class: "subtitle", "Scan two QR codes or paste JSON." }

            div { class: "grid",
                div {
                    div { class: "status-row",
                        span { "API Endpoint: " }
                        span { class: if scanned_api.read().is_empty() {"pill missing"} else {"pill ready"},
                            { if scanned_api.read().is_empty() {"missing"} else {"ready"} }
                        }
                    }
                    div { class: "status-row",
                        span { "Recording Info: " }
                        span { class: if scanned_info.read().0.is_empty() {"pill missing"} else {"pill ready"},
                            { if scanned_info.read().0.is_empty() {"missing"} else {"ready"} }
                        }
                    }
                    button { class: "btn", onclick: scan_qr, "Scan QR" }
                    form { class: "paste",
                        textarea { name: "paste", placeholder: "Paste JSON here..." }
                        button { class: "btn secondary", r#type: "button", onclick: detect_paste, "Detect" }
                    }

                    div { class: "advanced",
                        label { "Bearer Token (optional)" }
                        input { value: bearer, oninput: move |e| bearer.set(e.value()) }
                    }

                    div { class: "row",
                        button { class: "btn primary", disabled: !*can_save.read(), onclick: save, "Save Profile" }
                        button { class: "btn danger", onclick: clear, "Clear Profile" }
                    }
                }

                div {
                    h3 { "Current Profile" }
                    pre { class: "profile", {summary()} }
                }
            }
        }
    }
}

#[component]
fn WorkView() -> Element {
    let package_no = use_signal(|| String::new());
    let package_intact = use_signal(|| true);
    let quantity = use_signal(|| 0i64);
    let result = use_signal(|| String::new());
    let submitting = use_signal(|| false);

    let scan_pkg = move |_| {
        spawn(async move {
            match scan_code_js("any").await { Ok(text) => package_no.set(text), Err(e) => web_log(&format!("Scan error: {}", e)), }
        });
    };

    let minus = move |_| { if !*package_intact.read() { quantity.set((quantity() - 1).max(0)); } };
    let plus = move |_| { if !*package_intact.read() { quantity.set(quantity() + 1); } };

    let submit = move |_| {
        if *submitting.read() { return; }
        if load_profile().is_none(){ result.set("Error: No profile saved.".into()); return; }
        if package_no.read().trim().is_empty(){ result.set("Error: Package number required.".into()); return; }

        let prof = load_profile().unwrap();
        let payload = Payload{
            orderNo: prof.order_no.clone(),
            recordingNo: prof.recording_no,
            locationCode: prof.location_code.clone(),
            packageNo: package_no.read().trim().to_string(),
            quantity: if *package_intact.read() { 0 } else { quantity() },
            packageIntact: *package_intact.read(),
        };
        submitting.set(true);
        result.set("Submitting...".into());

        spawn(async move {
            let url = sanitize_endpoint(&prof.api_endpoint);
            let client = reqwest::Client::new();
            let mut req = client.post(url).header("Content-Type", "application/json").header("Accept", "application/json").header("x-ms-client-tracking-id", Uuid::new_v4().to_string());
            if let Some(tok) = &prof.bearer_token { if !tok.is_empty(){ req = req.header("Authorization", format!("Bearer {}", tok)); } }
            let resp = req.json(&payload).send().await;
            match resp {
                Ok(r) => {
                    let status = r.status();
                    let text = r.text().await.unwrap_or_default();
                    result.set(format!("Status: {}\n\nPayload:\n{}\n\nResponse:\n{}", status, serde_json::to_string_pretty(&payload).unwrap_or_default(), text));
                }
                Err(e) => {
                    result.set(format!("Request failed: {}", e));
                }
            }
            submitting.set(false);
        });
    };

    use_effect(move || async move { if *package_intact.read() { quantity.set(0); } });

    rsx! {
        section { class: "card",
            h2 { "2) Work" }
            p { class: "subtitle", "Submit package records with your saved profile" }

            div { class: "form-row",
                label { "Package No" }
                div { class: "inline",
                    input { value: package_no, oninput: move |e| package_no.set(e.value()), placeholder: "Scan or type package number" }
                    button { class: "btn", onclick: scan_pkg, "Scan" }
                }
            }

            div { class: "form-row",
                label { input { r#type: "checkbox", checked: package_intact, oninput: move |e| package_intact.set(e.value() == "on") } " Package intact" }
            }

            div { class: "form-row",
                label { "Quantity" }
                small { class: "hint", "Disabled when Package intact is checked" }
                div { class: "quantity",
                    button { class: "btn", disabled: *package_intact.read(), onclick: minus, "-" }
                    input { value: quantity, disabled: *package_intact.read(), oninput: move |e| quantity.set(e.value().parse::<i64>().unwrap_or(0))}
                    button { class: "btn", disabled: *package_intact.read(), onclick: plus, "+" }
                }
            }

            div { class: "actions",
                button { class: "btn primary", disabled: *submitting.read(), onclick: submit, { if *submitting.read() {"Submitting..."} else {"Submit"} } }
            }

            pre { class: "result", {result()} }
        }
    }
}

fn sanitize_endpoint(s: &str) -> String { s.trim().trim_start_matches('<').trim_end_matches('>').to_string() }

fn web_log(s: &str){
    #[cfg(target_arch = "wasm32")] {
        web_sys::console::log_1(&wasm_bindgen::JsValue::from_str(s));
    }
}

#[cfg(target_arch = "wasm32")]
async fn scan_code_js(kind: &str) -> Result<String, String> {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsCast;
    let window = web_sys::window().ok_or("no window")?;
    let f = js_sys::Reflect::get(&window, &JsValue::from_str("scanCode")).map_err(|_|"no scanCode")?;
    let func = f.dyn_into::<js_sys::Function>().map_err(|_|"not a function")?;
    let this = JsValue::NULL;
    let arg = JsValue::from_str(kind);
    let promise = func.call1(&this, &arg).map_err(|_|"call failed")?;
    let js_future = wasm_bindgen_futures::JsFuture::from(js_sys::Promise::from(promise));
    let res = js_future.await.map_err(|_|"promise rejected")?;
    res.as_string().ok_or("not a string".into())
}

#[cfg(not(target_arch = "wasm32"))]
async fn scan_code_js(_kind: &str) -> Result<String, String> {
    // Fallback for non-wasm: prompt not available in CI, return error
    Err("scan not supported".into())
}
