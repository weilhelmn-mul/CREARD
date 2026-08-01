with open('src/components/admin/AdminDashboard.tsx', 'r') as f:
    lines = f.readlines()

# 1. Add imports for new components after existing imports
import_idx = None
for i, line in enumerate(lines):
    if 'import TimeSlotPicker' in line:
        import_idx = i + 1
        break

if import_idx:
    new_imports = [
        'import PaymentValidationTab from \'@/components/admin/PaymentValidationTab\'\n',
        'import YapeConfigTab from \'@/components/admin/YapeConfigTab\'\n',
    ]
    if 'PaymentValidationTab' not in ''.join(lines):
        for j, imp in enumerate(new_imports):
            lines.insert(import_idx + j, imp)
        print('1. Added imports for PaymentValidationTab and YapeConfigTab')
    else:
        print('1. Imports already exist')

# 2. Add new tab types to AdminTab type
tab_type_idx = None
for i, line in enumerate(lines):
    if "type AdminTab =" in line:
        tab_type_idx = i
        break

if tab_type_idx:
    old_tab = lines[tab_type_idx]
    if 'pagos' not in old_tab and 'yape' not in old_tab:
        new_tab = old_tab.replace(
            "'config'",
            "'pagos' | 'yape_config' | 'config'"
        )
        lines[tab_type_idx] = new_tab
        print('2. Added pagos and yape_config to AdminTab type')
    else:
        print('2. Tab types already added')

# 3. Add new tabs to adminTabs array
admin_tabs_idx = None
for i, line in enumerate(lines):
    if '{ key: \'config\'' in line:
        admin_tabs_idx = i
        break

if admin_tabs_idx:
    new_tabs = [
        '  { key: \'pagos\',       label: \'Pagos\',          icon: \'verified\' },\n',
        '  { key: \'yape_config\',  label: \'Pago Yape\',      icon: \'qr_code_2\' },\n',
    ]
    if 'pagos' not in ''.join(lines[admin_tabs_idx:admin_tabs_idx+5]):
        for j, tab in enumerate(new_tabs):
            lines.insert(admin_tabs_idx + j, tab)
        print('3. Added new tabs to adminTabs array')
    else:
        print('3. Tabs already exist')

# 4. Add status for payment_pending in statusConfig
status_idx = None
for i, line in enumerate(lines):
    if 'cancelled:' in line and 'label:' in line:
        status_idx = i + 1
        break

if status_idx:
    new_status = '  payment_pending: { label: \'Pago Pendiente\',  color: \'bg-amber-500/20 text-amber-400\',    dot: \'bg-amber-400\' },\n'
    if 'payment_pending' not in ''.join(lines):
        lines.insert(status_idx, new_status)
        print('4. Added payment_pending status')
    else:
        print('4. Status already exists')

# 5. Add tab content rendering - find the config tab rendering and add before it
config_render_idx = None
for i, line in enumerate(lines):
    if "activeTab === 'config'" in line and '{' in line:
        config_render_idx = i
        break

if config_render_idx:
    new_renders = [
        '          {activeTab === \'pagos\' && (\n',
        '            <PaymentValidationTab />\n',
        '          )}\n',
        '          {activeTab === \'yape_config\' && (\n',
        '            <YapeConfigTab />\n',
        '          )}\n',
    ]
    # Check if they already exist
    existing = ''.join(lines[config_render_idx-6:config_render_idx])
    if 'PaymentValidationTab' not in existing:
        for j, render in enumerate(new_renders):
            lines.insert(config_render_idx + j, render)
        print('5. Added tab content rendering')
    else:
        print('5. Tab renders already exist')

with open('src/components/admin/AdminDashboard.tsx', 'w') as f:
    f.writelines(lines)

print('All admin tabs added!')
