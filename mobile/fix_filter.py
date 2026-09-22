import os

target_dir = '/Users/cdse/Desktop/RestPilot/mobile/lib/features'
target_line = '      filterType: PostgresChangeFilterType.eq,\n'

for root, dirs, files in os.walk(target_dir):
    for file in files:
        if file.endswith('.dart'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            new_lines = []
            changed = False
            for line in lines:
                if 'PostgresChangeFilterType.eq' in line:
                    changed = True
                    continue
                new_lines.append(line)
            
            if changed:
                with open(filepath, 'w') as f:
                    f.writelines(new_lines)
                print(f"Fixed {filepath}")
