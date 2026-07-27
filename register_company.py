import json
import os
import random
import re

# Master System Telegram Bot Token (Fixed for Aethra Vision Master Bot)
MASTER_TELEGRAM_BOT_TOKEN = "8337361642:AAHkEadKvtWMWnHaLVMnAM1COY97VYPiK-w"
REGISTRY_FILE_PATH = os.path.join(os.path.dirname(__file__), "licenses_registry.json")
ACTIVE_LICENSE_PATH = os.path.join(os.path.dirname(__file__), "aethra.license.json")
FRONTEND_LICENSE_PATH = os.path.join(os.path.dirname(__file__), "frontend", "public", "aethra.license.json")

def print_banner():
    print("\n" + "=" * 65)
    print("  🛡️  AETHRA VISION — MASTER MULTI-TENANT LICENSE SUITE")
    print("=" * 65)

def generate_tenant_id(company_name):
    clean = re.sub(r'[^A-Za-z0-9]', '', company_name).upper()
    prefix = clean[:6] if len(clean) >= 6 else clean.ljust(6, 'X')
    rand_num = random.randint(1000, 9999)
    return f"TEN-{prefix}-{rand_num}"

def generate_license_key(tenant_id):
    rand_seq = random.randint(10000, 99999)
    return f"AETHRA-SEC-{rand_seq}-{tenant_id}"

def load_registry():
    if os.path.exists(REGISTRY_FILE_PATH):
        try:
            with open(REGISTRY_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_registry(registry):
    with open(REGISTRY_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

def set_active_license(license_data):
    with open(ACTIVE_LICENSE_PATH, "w", encoding="utf-8") as f:
        json.dump(license_data, f, indent=2)
    if os.path.exists(os.path.dirname(FRONTEND_LICENSE_PATH)):
        with open(FRONTEND_LICENSE_PATH, "w", encoding="utf-8") as f:
            json.dump(license_data, f, indent=2)

def load_active_license():
    if os.path.exists(ACTIVE_LICENSE_PATH):
        try:
            with open(ACTIVE_LICENSE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def register_new_company():
    print("\n--- 📝 REGISTER NEW CLIENT COMPANY ---")
    company_name = input("1. Company Name (e.g., Commercial Bank PLC): ").strip() or "Dialog Axiata HQ"
    admin_email = input("2. Master Admin Email (e.g., admin@client.lk): ").strip() or "security_admin@dialog.lk"
    admin_phone = input("3. 2FA Authorized Mobile (+9477XXXXXXX): ").strip() or "+94778920140"
    hotline = input("4. Security Command Hotline (+9411XXXXXXX): ").strip() or "+94112345678"
    telegram_chat_id = input("5. Telegram Security Group Chat ID (-100198201405): ").strip() or "-100198201405"
    max_cams_str = input("6. Max Allowed Camera Streams [Default 32]: ").strip()
    max_cameras = int(max_cams_str) if max_cams_str.isdigit() else 32
    valid_until = input("7. License Expiry Date [Default 2028-12-31]: ").strip() or "2028-12-31"

    tenant_id = generate_tenant_id(company_name)
    license_key = generate_license_key(tenant_id)

    license_data = {
        "license_key": license_key,
        "company_name": company_name,
        "tenant_id": tenant_id,
        "master_admin_email": admin_email,
        "admin_authorized_phone": admin_phone,
        "security_command_hotline": hotline,
        "telegram_chat_id": telegram_chat_id,
        "telegram_bot_token": MASTER_TELEGRAM_BOT_TOKEN,
        "max_cameras": max_cameras,
        "ai_features": [
            "suspicious_activity_detection",
            "cross_camera_person_handoff",
            "ptz_auto_tracking",
            "intrusion_line_crossing",
            "telegram_realtime_threat_alerts"
        ],
        "valid_until": valid_until
    }

    registry = load_registry()
    registry[tenant_id] = license_data
    save_registry(registry)
    set_active_license(license_data)

    print_success_summary(f"COMPANY '{company_name}' REGISTERED & ACTIVATED", license_data)

def switch_active_company():
    registry = load_registry()
    if not registry:
        print("\n❌ No registered companies found in registry. Register a new company first.")
        return

    print("\n--- 🏢 SELECT & ACTIVATE COMPANY (SWITCH TENANT) ---")
    keys = list(registry.keys())
    for idx, tid in enumerate(keys, 1):
        item = registry[tid]
        print(f"  [{idx}] {item.get('company_name')} ({tid}) — Chat ID: {item.get('telegram_chat_id')}")

    choice = input(f"\nSelect Company Number (1 - {len(keys)}): ").strip()
    digits = re.sub(r'[^0-9]', '', choice)

    if digits and digits.isdigit() and 1 <= int(digits) <= len(keys):
        selected_tid = keys[int(digits) - 1]
        selected_data = registry[selected_tid]
        set_active_license(selected_data)
        print_success_summary(f"ACTIVATED TENANT: {selected_data.get('company_name')}", selected_data)
    else:
        print("Invalid selection.")

def edit_field_menu():
    active = load_active_license()
    if not active:
        print("\n❌ No active license found.")
        return

    print(f"\n--- ✏️ EDIT SPECIFIC FIELD FOR: {active.get('company_name')} ({active.get('tenant_id')}) ---")
    print(f"  [1] Telegram Group Chat ID   : {active.get('telegram_chat_id')}")
    print(f"  [2] 2FA Authorized Mobile    : {active.get('admin_authorized_phone')}")
    print(f"  [3] Master Admin Email       : {active.get('master_admin_email')}")
    print(f"  [4] Security Hotline         : {active.get('security_command_hotline')}")
    print(f"  [5] Max Camera Limit         : {active.get('max_cameras')} Feeds")
    print(f"  [6] License Expiry Date      : {active.get('valid_until')}")
    print(f"  [7] Company Name             : {active.get('company_name')}")

    field_choice = input("\nWhich field number do you want to edit? (1 - 7): ").strip()
    digits = re.sub(r'[^0-9]', '', field_choice)

    if digits == '1':
        new_val = input(f"Enter NEW Telegram Chat ID [{active.get('telegram_chat_id')}]: ").strip()
        if new_val: active['telegram_chat_id'] = new_val
    elif digits == '2':
        new_val = input(f"Enter NEW 2FA Mobile Number [{active.get('admin_authorized_phone')}]: ").strip()
        if new_val: active['admin_authorized_phone'] = new_val
    elif digits == '3':
        new_val = input(f"Enter NEW Master Admin Email [{active.get('master_admin_email')}]: ").strip()
        if new_val: active['master_admin_email'] = new_val
    elif digits == '4':
        new_val = input(f"Enter NEW Security Hotline [{active.get('security_command_hotline')}]: ").strip()
        if new_val: active['security_command_hotline'] = new_val
    elif digits == '5':
        new_val = input(f"Enter NEW Max Cameras [{active.get('max_cameras')}]: ").strip()
        if new_val.isdigit(): active['max_cameras'] = int(new_val)
    elif digits == '6':
        new_val = input(f"Enter NEW Expiry Date [{active.get('valid_until')}]: ").strip()
        if new_val: active['valid_until'] = new_val
    elif digits == '7':
        new_val = input(f"Enter NEW Company Name [{active.get('company_name')}]: ").strip()
        if new_val: active['company_name'] = new_val
    else:
        print("No changes made.")
        return

    # Update registry and active license
    registry = load_registry()
    tid = active.get('tenant_id')
    registry[tid] = active
    save_registry(registry)
    set_active_license(active)

    print_success_summary("LICENSE FIELD UPDATED SUCCESSFULLY", active)

def list_all_companies():
    registry = load_registry()
    if not registry:
        print("\n❌ Registry is empty.")
        return
    print(f"\n--- 📋 ALL REGISTERED CLIENT COMPANIES ({len(registry)}) ---")
    for idx, (tid, data) in enumerate(registry.items(), 1):
        print(f" [{idx}] {data.get('company_name')} | Tenant: {tid} | Admin: {data.get('master_admin_email')} | Chat ID: {data.get('telegram_chat_id')}")
    print()

def print_success_summary(title, data):
    print("\n" + "=" * 65)
    print(f"  ✅ {title}")
    print("=" * 65)
    print(f" • Company Name           : {data.get('company_name')}")
    print(f" • Tenant ID              : {data.get('tenant_id')}")
    print(f" • Master Admin Email     : {data.get('master_admin_email')}")
    print(f" • 2FA Authorized Mobile  : {data.get('admin_authorized_phone')}")
    print(f" • Telegram Alert Chat ID : {data.get('telegram_chat_id')}")
    print(f" • Camera Limit           : {data.get('max_cameras')} Feeds")
    print(f" • License Expiry         : {data.get('valid_until')}")
    print(f" • License Key            : {data.get('license_key')}")
    print("=" * 65)
    print("License files updated in both root and frontend/public!\n")

def main():
    print_banner()
    active = load_active_license()
    if active:
        print(f"  ACTIVE TENANT: {active.get('company_name')} ({active.get('tenant_id')})")
        print(f"  TELEGRAM CHAT ID: {active.get('telegram_chat_id')}")
    print("=" * 65)
    print("  [1] Select & Activate Company License (Switch Active Tenant)")
    print("  [2] Register New Client Company")
    print("  [3] Edit Specific Field of Active License (1-Click Field Picker)")
    print("  [4] List All Registered Client Companies")
    print("=" * 65)

    raw_input = input("\nSelect Option (1 / 2 / 3 / 4) [Default 1]: ").strip()
    digits = re.sub(r'[^0-9]', '', raw_input)

    if digits == '1' or 'switch' in raw_input.lower() or 'select' in raw_input.lower():
        switch_active_company()
    elif digits == '2' or 'new' in raw_input.lower() or 'add' in raw_input.lower():
        register_new_company()
    elif digits == '3' or 'edit' in raw_input.lower() or 'update' in raw_input.lower():
        edit_field_menu()
    elif digits == '4' or 'list' in raw_input.lower() or 'show' in raw_input.lower():
        list_all_companies()
    else:
        switch_active_company()

if __name__ == "__main__":
    main()
