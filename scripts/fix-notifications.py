#!/usr/bin/env python3
import re
BASE = '/home/z/my-project'
with open(f'{BASE}/src/app/api/notifications/dispatch/route.ts', 'r') as f:
    content = f.read()

# Find the section from 'try {' inside else to the broken closing
# Replace the whole Google Chat section
old = '''      } else {
        try {
          for (const alert of alerts) {
          const isExpired = alert.alertType === 'expired';'''

new = '''      } else {
        try {
          for (const alert of alerts) {
            const isExpired = alert.alertType === 'expired';'''

content = content.replace(old, new)

# Fix the rest of the broken indentation inside the for loop
# Lines after 'for' have wrong indent - they need 12 spaces
lines = content.split('\n')
fixed = []
in_broken_for = False
for i, line in enumerate(lines):
    if 'for (const alert of alerts) {' in line and 'P0-04' not in lines[max(0,i-3):i][-1] if lines[max(0,i-3):i] else '':
        # This is the broken for loop - next lines need fixing
        in_broken_for = True
        fixed.append(line)
        continue
    if in_broken_for:
        # Check if this line needs more indent (currently at 10 spaces, needs 12)
        stripped = line.lstrip()
        if stripped.startswith('const isExpired') or stripped.startswith('const emoji') or \
           stripped.startswith('const text') or stripped.startswith('?') or \
           stripped.startswith(':') or stripped.startswith('if (test)') or \
           stripped.startswith('// Test') or stripped.startswith('const testText') or \
           stripped.startswith('await fetch(webhookUrl') or stripped.startswith('method:') or \
           stripped.startswith("headers:") or stripped.startswith('body:') or \
           stripped.startswith('} else') or stripped.startswith('}'):
            if line.startswith('          ') and not line.startswith('            '):
                line = '          ' + line  # no change needed actually
        # Detect end of for loop
        if stripped == '}':
            in_broken_for = False
    fixed.append(line)

content = '\n'.join(fixed)

# Fix the broken closing section
old_close = '''        results.googleChat = { ok: true };
      } catch (err: any) {
        console.warn('[Notifications] Google Chat failed:', err.message);
        results.googleChat = { ok: false, error: err.message };
      }
      } // end P0-04 SSRF guard else block'''

new_close = '''          results.googleChat = { ok: true };
        } catch (err: any) {
          console.warn('[Notifications] Google Chat failed:', err.message);
          results.googleChat = { ok: false, error: err.message };
        }
      }
    }'''

content = content.replace(old_close, new_close)

# Also fix the missing closing brace for WhatsApp client section
# The original has only 1 closing brace but needs 2 (for if phoneId and for if waClientEnabled)
old_wa_client = '''        results.whatsapp_client = { ok: true };
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Notifications] WhatsApp client failed:', err.message);
        results.whatsapp_client = { ok: false, error: err.message };
      }

    return NextResponse.json'''

new_wa_client = '''                results.whatsapp_client = { ok: true };
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Notifications] WhatsApp client failed:', err.message);
        results.whatsapp_client = { ok: false, error: err.message };
      }
    }

    return NextResponse.json'''

content = content.replace(old_wa_client, new_wa_client)

with open(f'{BASE}/src/app/api/notifications/dispatch/route.ts', 'w') as f:
    f.write(content)

print('Fixed notifications dispatch')
