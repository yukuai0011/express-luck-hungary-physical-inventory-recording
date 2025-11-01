use dioxus::prelude::*;
use dioxus_primitives::toggle_group::{ToggleGroup, ToggleItem};
use serde::{Deserialize, Serialize};

// Data model for the saved profile
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
struct Profile {
    api_endpoint: String,
    order_no: String,
    recording_no: i64,
    location_code: String,
    #[serde(default)]
    bearer_token: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum PillState {
    Missing,
    Ready,
}

#[component]
fn Pill(state: PillState) -> Element {
    let (label, class) = match state {
        PillState::Missing => ("missing", "pill pill-gray"),
        PillState::Ready => ("ready", "pill pill-green"),
    };
    rsx! {
        span { class: class, {label} }
    }
}

#[component]
fn App() -> Element {
    // Scan state
    let scanned_api = use_signal(|| None::<String>);
    let scanned_info = use_signal(|| None::<(String, i64, String)>);

    // Persisted profile
    let profile = use_signal(|| load_profile());

    // Work form
    let package_no = use_signal(|| String::new());
    let package_intact = use_signal(|| true);
    let quantity = use_signal(|| 0i64);
    let result = use_signal(|| String::new());

    // Derived
    let can_save_profile = move || scanned_api.read().is_some() && scanned_info.read().is_some();

    // Dioxus Primitives example: ToggleGroup to change intact state
    // We use two items: Yes/No. Single-select semantics via allow_multiple_pressed: false
    let intact_toggle = {
        let package_intact = package_intact.clone();
        rsx! {
            div { class: "form-row",
                label { "Package intact" }
                ToggleGroup { horizontal: true, allow_multiple_pressed: false,
                    // Yes => index 0
                    ToggleItem { index: 0usize, class: "btn btn-secondary",
                        onclick: move |_| {
                            package_intact.set(true);
                            quantity.set(0);
                        },
                        "Yes"
                    }
                    // No => index 1
                    ToggleItem { index: 1usize, class: "btn btn-secondary",
                        onclick: move |_| package_intact.set(false),
                        "No"
                    }
                }
            }
        }
    };

    rsx! {
        link { rel: "stylesheet", href: "/assets/style.css" }
        header {
            h1 { "Inventory Scanner PoC" }
            p { class: "subtitle", "GitHub Pages-ready, camera-enabled QR/Barcode app (Dioxus)" }
        }
        main {
            section { class: "card", id: "profile-section",
                h2 { "1) Recording Profile" }
                p { "Scan two QR codes in any order to establish a profile: ", strong {"API Endpoint"}, " and ", strong {"Recording Info"}, ". The app will combine and save them as a cookie." }

                div { class: "grid two",
                    div {
                        h3 { "Scan QR Codes" }
                        div { class: "scan-status",
                            div { "API Endpoint: ",
                                if scanned_api.read().is_some() { rsx!( Pill { state: PillState::Ready } ) } else { rsx!( Pill { state: PillState::Missing } ) }
                            }
                            div { "Recording Info: ",
                                if scanned_info.read().is_some() { rsx!( Pill { state: PillState::Ready } ) } else { rsx!( Pill { state: PillState::Missing } ) }
                            }
                        }
                        div { class: "actions-row",
                            // For now, stub the scanner button: in web, the ZXing script is injected and could be called via JS.
                            button { class: "btn", onclick: move |_| {
                                // Try a JS prompt-like fallback to paste JSON
                                let txt = web_prompt("Paste QR JSON text (API endpoint or Recording info)");
                                if let Some(t) = txt { handle_qr_text(&t, &scanned_api, &scanned_info); }
                            }, "Scan QR" }
                            button { class: "btn btn-secondary", onclick: move |_| {
                                scanned_api.set(None);
                                scanned_info.set(None);
                            }, "Reset" }
                        }

                        details { class: "mt-8",
                            summary { "Paste JSON instead" }
                            div { class: "paste-area",
                                // Simple textarea and detect button
                                textarea {
                                    placeholder: "{\"apiEndpoint\":\"<https://...>\"} OR {\"orderNo\":\"1234\",\"recordingNo\":1,\"locationCode\":\"FG HU\"}",
                                    rows: "4",
                                    oninput: move |evt| PASTE_TEXT.with(|x| *x.borrow_mut() = evt.value().to_string()),
                                }
                                div { class: "actions-row",
                                    button { class: "btn btn-secondary", onclick: move |_| {
                                        if let Some(t) = PASTE_TEXT.with(|x| x.borrow().clone().into()) { handle_qr_text(&t, &scanned_api, &scanned_info); }
                                    }, "Detect" }
                                }
                            }
                        }

                        details { class: "mt-8",
                            summary { "Advanced: Optional Bearer Token" }
                            input { r#type: "password", id: "bearer-token", placeholder: "Bearer token (optional)",
                                oninput: move |e| {
                                    // store temporarily on the profile signal if present
                                    if let Some(mut p) = profile.read().clone() {
                                        p.bearer_token = Some(e.value());
                                        profile.set(Some(p));
                                    }
                                }
                            }
                        }

                        div { class: "actions-row mt-12",
                            button { class: "btn btn-primary", disabled: !can_save_profile(), onclick: move |_| {
                                if let (Some(api), Some((order_no, recording_no, location_code))) = (scanned_api.read().clone(), scanned_info.read().clone()) {
                                    let mut p = Profile { api_endpoint: sanitize_endpoint(&api), order_no, recording_no, location_code, bearer_token: None };
                                    if let Some(existing) = profile.read().clone() { if existing.bearer_token.is_some() { p.bearer_token = existing.bearer_token.clone(); } }
                                    save_profile(&p);
                                    profile.set(Some(p));
                                    notify("Profile saved to cookie.");
                                }
                            }, "Save Profile to Cookie" }
                            button { class: "btn btn-danger", onclick: move |_| {
                                clear_profile();
                                profile.set(None);
                                scanned_api.set(None);
                                scanned_info.set(None);
                                notify("Profile cookie cleared.");
                            }, "Clear Profile Cookie" }
                        }
                    }

                    div {
                        h3 { "Current Profile" }
                        div { id: "profile-summary", class: "profile",
                            if let Some(p) = profile.read().as_ref() {
                                pre { {serde_json::to_string_pretty(&ProfileRedacted::from(p)).unwrap_or_default()} }
                            } else {
                                em { "No profile saved." }
                            }
                        }
                    }
                }
            }

            section { class: "card", id: "work-section",
                h2 { "2) Work" }
                p { "Use your saved profile to submit package records." }

                div { class: "form-row",
                    label { r#for: "package-no", "Package No" }
                    div { class: "inline",
                        input { id: "package-no", r#type: "text", placeholder: "Scan or type package number",
                            value: "{package_no}",
                            oninput: move |e| package_no.set(e.value())
                        }
                        button { class: "btn", onclick: move |_| {
                            // Stub: barcode scanning - prompt
                            if let Some(txt) = web_prompt("Enter package barcode text") { package_no.set(txt); }
                        }, "Scan Barcode" }
                    }
                }

                {intact_toggle}

                div { class: "form-row",
                    label { r#for: "quantity", "Quantity" }
                    div { class: "quantity-row",
                        button { class: "btn btn-icon", disabled: *package_intact.read(), onclick: move |_| { if !*package_intact.read() { quantity.set((quantity() - 1).max(0)); } }, "−" }
                        input { id: "quantity", r#type: "number", min: "0", step: "1",
                            value: "{quantity}", disabled: *package_intact.read(),
                            oninput: move |e| if let Ok(v) = e.value().parse::<i64>() { quantity.set(v.max(0)); }
                        }
                        button { class: "btn btn-icon", disabled: *package_intact.read(), onclick: move |_| { if !*package_intact.read() { quantity.set(quantity() + 1); } }, "+" }
                    }
                    small { class: "hint", "Disabled when Package intact is checked. In that case, your cloud default will be used." }
                }

                div { class: "actions-row mt-12",
                    button { class: "btn btn-primary", onclick: move |_| {
                        spawn({
                            let profile = profile.read().clone();
                            let package_no = package_no.read().clone();
                            let package_intact = *package_intact.read();
                            let quantity = *quantity.read();
                            let result = result.clone();
                            async move {
                                let output = submit(package_no, package_intact, quantity, profile.as_ref()).await;
                                result.set(output);
                            }
                        });
                    }, "Submit" }
                }

                div { id: "result", class: "result mt-12", pre { {result()} } }
            }

            section { class: "card", id: "about-section",
                h2 { "Notes" }
                ul {
                    li { "Camera access is required for scanning. On the web, ZXing is injected. On Android, CI builds an APK; camera integration can be added later." }
                    li { "If your endpoint requires OAuth, provide a bearer token in Profile. Otherwise, signed URLs with a sig parameter typically work without a token." }
                    li { "When hosted on GitHub Pages, cross-origin (CORS) must be allowed by your Power Automate endpoint." }
                }
            }
        }
    }
}

#[derive(Serialize)]
struct SubmitPayload<'a> {
    orderNo: &'a str,
    recordingNo: i64,
    locationCode: &'a str,
    packageNo: &'a str,
    quantity: i64,
    packageIntact: bool,
}

async fn submit(package_no: String, package_intact: bool, mut quantity: i64, profile: Option<&Profile>) -> String {
    if profile.is_none() { return "Error: No profile saved. Please create and save a profile first.".to_string(); }
    let p = profile.unwrap();
    if !p.api_endpoint.starts_with("http://") && !p.api_endpoint.starts_with("https://") {
        return "Error: Profile API endpoint is invalid.".into();
    }
    if package_no.trim().is_empty() { return "Error: Package number is required.".into(); }
    if package_intact { quantity = 0; }

    let payload = SubmitPayload {
        orderNo: &p.order_no,
        recordingNo: p.recording_no,
        locationCode: &p.location_code,
        packageNo: &package_no,
        quantity,
        packageIntact: package_intact,
    };

    // Use window.fetch when on web for CORS-friendly behavior
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsCast;
        use wasm_bindgen::JsValue;
        use wasm_bindgen_futures::JsFuture;
        use web_sys::{RequestInit, RequestMode, Response, window};

        let window = window().ok_or("").unwrap();
        let mut opts = RequestInit::new();
        opts.method("POST");
        opts.mode(RequestMode::Cors);
        let headers = js_sys::Object::new();
        js_sys::Reflect::set(&headers, &JsValue::from_str("Content-Type"), &JsValue::from_str("application/json")).ok();
        if let Some(token) = &p.bearer_token { js_sys::Reflect::set(&headers, &JsValue::from_str("Authorization"), &JsValue::from_str(&format!("Bearer {}", token))).ok(); }
        opts.headers(&headers);
        opts.body(Some(&JsValue::from_str(&serde_json::to_string(&payload).unwrap())));

        let resp_value = JsFuture::from(window.fetch_with_str_and_init(&sanitize_endpoint(&p.api_endpoint), &opts)).await;
        let mut out = format!("POST {}\nPayload:\n{}\n\n", p.api_endpoint, serde_json::to_string_pretty(&payload).unwrap());
        match resp_value {
            Ok(v) => {
                let resp: Response = v.dyn_into().unwrap();
                let status = resp.status();
                let ok = resp.ok();
                let text = JsFuture::from(resp.text().unwrap()).await.ok().and_then(|t| t.as_string()).unwrap_or_default();
                out.push_str(&format!("Response:\n{{\n  \"status\": {},\n  \"ok\": {},\n  \"text\": {}\n}}", status, ok, serde_json::to_string(&text).unwrap()));
                out
            }
            Err(e) => {
                out.push_str(&format!("Request failed. This may be due to CORS or network issues.\n{}", js_error_string(e)));
                out
            }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let client = reqwest::Client::new();
        let mut req = client.post(sanitize_endpoint(&p.api_endpoint)).json(&payload);
        if let Some(token) = &p.bearer_token { req = req.bearer_auth(token); }
        match req.send().await {
            Ok(resp) => {
                let status = resp.status();
                match resp.text().await {
                    Ok(text) => format!(
                        "POST {}\nPayload:\n{}\n\nResponse:\n{{\n  \"status\": {},\n  \"ok\": {},\n  \"text\": {}\n}}",
                        p.api_endpoint,
                        serde_json::to_string_pretty(&payload).unwrap(),
                        status.as_u16(),
                        status.is_success(),
                        serde_json::to_string(&text).unwrap()
                    ),
                    Err(e) => format!("Request text error: {}", e),
                }
            }
            Err(e) => format!("Request failed: {}", e),
        }
    }
}

// Web helpers
#[cfg(target_arch = "wasm32")]
fn web_prompt(msg: &str) -> Option<String> {
    use web_sys::window;
    window()?.prompt_with_message(msg).ok().flatten()
}
#[cfg(not(target_arch = "wasm32"))]
fn web_prompt(_msg: &str) -> Option<String> { None }

#[cfg(target_arch = "wasm32")]
fn notify(msg: &str) {
    use web_sys::window;
    if let Some(w) = window() { let _ = w.alert_with_message(msg); }
}
#[cfg(not(target_arch = "wasm32"))]
fn notify(_msg: &str) {}

#[cfg(target_arch = "wasm32")]
fn js_error_string(e: wasm_bindgen::JsValue) -> String {
    js_sys::JSON::stringify(&e).ok().and_then(|v| v.as_string()).unwrap_or_else(|| format!("{:?}", e))
}

fn sanitize_endpoint(s: &str) -> String {
    let mut s = s.trim().to_string();
    if s.starts_with('<') && s.ends_with('>') && s.len() > 2 {
        s = s[1..s.len()-1].to_string();
    }
    s
}

thread_local! {
    static PASTE_TEXT: std::cell::RefCell<String> = const { std::cell::RefCell::new(String::new()) };
}

#[derive(Serialize)]
struct ProfileRedacted<'a> {
    apiEndpoint: &'a str,
    orderNo: &'a str,
    recordingNo: i64,
    locationCode: &'a str,
    bearerToken: &'a str,
}
impl<'a> From<&'a Profile> for ProfileRedacted<'a> {
    fn from(p: &'a Profile) -> Self {
        Self { apiEndpoint: &p.api_endpoint, orderNo: &p.order_no, recordingNo: p.recording_no, locationCode: &p.location_code, bearerToken: if p.bearer_token.is_some() { "(stored)" } else { "(none)" } }
    }
}

fn handle_qr_text(text: &str, scanned_api: &Signal<Option<String>>, scanned_info: &Signal<Option<(String, i64, String)>>) {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
        if let Some(api) = json.get("apiEndpoint").and_then(|v| v.as_str()) {
            scanned_api.set(Some(api.to_string()));
            return;
        }
        let order_no = json.get("orderNo").and_then(|v| v.as_str()).map(|s| s.to_string());
        let location_code = json.get("locationCode").and_then(|v| v.as_str()).map(|s| s.to_string());
        let recording_no = json.get("recordingNo").and_then(|v| v.as_i64());
        if let (Some(order_no), Some(location_code), Some(recording_no)) = (order_no, location_code, recording_no) {
            scanned_info.set(Some((order_no, recording_no, location_code)));
        }
    }
}

fn save_profile(p: &Profile) {
    #[cfg(target_arch = "wasm32")]
    {
        use web_sys::window;
        if let Some(win) = window() {
            if let Ok(Some(storage)) = win.local_storage() {
                let _ = storage.set_item("inventoryProfile", &serde_json::to_string(p).unwrap());
            }
        }
    }
}

fn load_profile() -> Option<Profile> {
    #[cfg(target_arch = "wasm32")]
    {
        use web_sys::window;
        if let Some(win) = window() {
            if let Ok(Some(storage)) = win.local_storage() {
                if let Ok(Some(raw)) = storage.get_item("inventoryProfile") {
                    if let Ok(p) = serde_json::from_str::<Profile>(&raw) { return Some(p); }
                }
            }
        }
        None
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        None
    }
}

fn clear_profile() {
    #[cfg(target_arch = "wasm32")]
    {
        use web_sys::window;
        if let Some(win) = window() {
            if let Ok(Some(storage)) = win.local_storage() { let _ = storage.remove_item("inventoryProfile"); }
        }
    }
}

fn main() {
    launch(App);
}
