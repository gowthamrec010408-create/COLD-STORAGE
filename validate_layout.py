import os
import re

def validate():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    print("=== QORA TECH VALIDATION ===")
    logo_path = os.path.join('static', 'images', 'logo.png')
    print(f"1. Logo asset exists ({logo_path}):", os.path.exists(logo_path))
    print(f"2. Logo references in index.html:", len(re.findall(r'static/images/logo\.png', content)))

    views = ['loginView', 'registerView', 'farmerView', 'cropsView', 'historyView', 'devicesView', 'helpView', 'adminView']
    print("3. View Containers Check:")
    for v in views:
        found = f'id="{v}"' in content or f"id='{v}'" in content
        print(f"   - {v}: {'[OK] FOUND' if found else '[FAIL] MISSING'}")

    main_open = len(re.findall(r'<main\b', content))
    main_close = len(re.findall(r'</main>', content))
    print(f"4. <main> tag balance: {main_open} open / {main_close} close -> {'[OK] BALANCED' if main_open == main_close else '[FAIL] MISMATCH'}")

    # Check templates as well
    base_tpl = open(os.path.join('templates', 'base.html'), encoding='utf-8').read()
    login_tpl = open(os.path.join('templates', 'login.html'), encoding='utf-8').read()
    reg_tpl = open(os.path.join('templates', 'register.html'), encoding='utf-8').read()

    print("5. Templates Logo Checks:")
    print("   - base.html has logo:", 'logo.png' in base_tpl)
    print("   - login.html has logo:", 'logo.png' in login_tpl)
    print("   - register.html has logo:", 'logo.png' in reg_tpl)

if __name__ == '__main__':
    validate()
