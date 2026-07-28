import re

with open('src/components/home/HeroSection.tsx', 'rb') as f:
    raw = f.read()

# Find the futbol emoji line to extract emoji bytes
futbol_marker = b"{ key: 'futbol'"
futbol_line_start = raw.find(futbol_marker)
futbol_line_end = raw.find(b'\n', futbol_line_start)
futbol_line = raw[futbol_line_start:futbol_line_end]

voley_marker = b"{ key: 'voley'"
voley_line_start = raw.find(voley_marker)
voley_line_end = raw.find(b'\n', voley_line_start)
voley_line = raw[voley_line_start:voley_line_end]

# Extract emoji bytes between emoji: ' and '
futbol_emoji_match = re.search(rb"emoji: '([^']+)'", futbol_line)
voley_emoji_match = re.search(rb"emoji: '([^']+)'", voley_line)

futbol_emoji = futbol_emoji_match.group(1).decode('utf-8')
voley_emoji = voley_emoji_match.group(1).decode('utf-8')

print(f'Futbol emoji: {repr(futbol_emoji)}')
print(f'Voley emoji: {repr(voley_emoji)}')

# Read as text
with open('src/components/home/HeroSection.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Lines 167-199 (0-indexed: 166-198)
new_block = [
    '  // Correct hardcoded prices by sport and time period\n',
    '  const tariffInfo = [\n',
    f"    {{ sport: 'futbol', emoji: '{futbol_emoji}', label: 'F\u00fatbol 7', morning: 'S/ 35', afternoon: 'S/ 35', night: 'S/ 50' }},\n",
    f"    {{ sport: 'voley', emoji: '{voley_emoji}', label: 'V\u00f3ley', morning: 'S/ 30', afternoon: 'S/ 30', night: 'S/ 45' }},\n",
    '  ]\n',
]

new_lines = lines[:166] + new_block + lines[199:]

with open('src/components/home/HeroSection.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'New total lines: {len(new_lines)}')
print('Done!')
