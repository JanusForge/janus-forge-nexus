# Read the file
with open('app.py', 'r') as f:
    lines = f.readlines()

# Find and replace the Gemini model line
for i, line in enumerate(lines):
    if "gemini_model = genai.GenerativeModel" in line:
        # Replace with the known working model
        lines[i] = '    gemini_model = genai.GenerativeModel("gemini-1.5-pro-latest")\n'
        print("✅ Updated Gemini model to gemini-1.5-pro-latest (known working version)")
        break

# Write back
with open('app.py', 'w') as f:
    f.writelines(lines)
