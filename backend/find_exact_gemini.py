import os
import google.generativeai as genai

try:
    genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
    
    print("🔍 ALL Available Gemini Models:")
    print("=" * 50)
    
    models = genai.list_models()
    gemini_models = []
    
    for model in models:
        if 'gemini' in model.name.lower():
            gemini_models.append(model)
            supports_generate = 'generateContent' in model.supported_generation_methods
            status = "✅ GENERATE" if supports_generate else "❌ NO GENERATE"
            print(f"{status}: {model.name}")
    
    print("\n🎯 Recommended models to try (that support generateContent):")
    for model in gemini_models:
        if 'generateContent' in model.supported_generation_methods:
            print(f"  - '{model.name}'")
            
    if gemini_models:
        print(f"\n💡 Most likely working model: '{gemini_models[0].name}'")
    else:
        print("\n❌ No Gemini models found!")
            
except Exception as e:
    print(f"Error: {e}")
