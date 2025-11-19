import os
import google.generativeai as genai

# Method 1: Direct API key configuration
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("❌ GOOGLE_API_KEY not found in environment")
    exit(1)

print(f"🔑 API Key loaded: {api_key[:10]}...")

try:
    # Configure with API key directly
    genai.configure(api_key=api_key)
    
    print("✅ Google AI configured successfully")
    
    # List available models
    print("\n🔍 Available Gemini Models:")
    models = genai.list_models()
    
    working_models = []
    for model in models:
        if 'gemini' in model.name.lower() and 'generateContent' in model.supported_generation_methods:
            working_models.append(model.name)
            print(f"✅ {model.name}")
    
    if working_models:
        print(f"\n🎯 Top recommended model: '{working_models[0]}'")
        
        # Test the first working model
        print(f"\n🧪 Testing model: '{working_models[0]}'")
        model = genai.GenerativeModel(working_models[0])
        response = model.generate_content("Hello, please respond with just 'OK'")
        print(f"✅ Test successful! Response: {response.text}")
    else:
        print("❌ No working Gemini models found")
        
except Exception as e:
    print(f"❌ Error: {e}")
