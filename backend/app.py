from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from datetime import datetime

# Try to import optional dependencies
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️  google-generativeai not available")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  openai not available")

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("⚠️  anthropic not available")

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') 
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
GROK_API_KEY = os.getenv('GROK_API_KEY')

# Initialize API clients
openai_client = None
anthropic_client = None

if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
    anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)

if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- SESSION STORAGE ---
session_storage = {}

# --- API CALL FUNCTIONS ---
def call_openai_api(prompt):
    """Call OpenAI GPT API"""
    if not openai_client:
        return "🔧 OpenAI is experiencing technical issues. Please try again later."
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ OpenAI API error: {str(e)}")
        return "🔧 OpenAI is experiencing technical issues. Please try again later."

def call_gemini_api(prompt):
    """Call Google Gemini API"""
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        return "🔧 Gemini is experiencing technical issues. Please try again later."
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"❌ Gemini API error: {str(e)}")
        return "🔧 Gemini is experiencing technical issues. Please try again later."

def call_anthropic_api(prompt):
    """Call Anthropic Claude API"""
    if not anthropic_client:
        return "🔧 Claude is experiencing technical issues. Please try again later."
    
    try:
        response = anthropic_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        print(f"❌ Anthropic API error: {str(e)}")
        return "🔧 Claude is experiencing technical issues. Please try again later."

def call_deepseek_api(prompt):
    """Call DeepSeek API via REST"""
    if not DEEPSEEK_API_KEY:
        return "🔧 DeepSeek is experiencing technical issues. Please try again later."
    
    try:
        headers = {
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000,
            "stream": False
        }
        response = requests.post(
            'https://api.deepseek.com/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            response_data = response.json()
            return response_data['choices'][0]['message']['content']
        else:
            print(f"❌ DeepSeek API error: {response.status_code} - {response.text}")
            return "🔧 DeepSeek is experiencing technical issues. Please try again later."
            
    except Exception as e:
        print(f"❌ DeepSeek error: {str(e)}")
        return "🔧 DeepSeek is experiencing technical issues. Please try again later."

def call_grok_api(prompt):
    """Call SuperGrok API"""
    if not GROK_API_KEY:
        return "🔧 Grok is experiencing technical issues. Please try again later."
    
    try:
        # SuperGrok API - adjust endpoint based on actual API docs
        headers = {
            'Authorization': f'Bearer {GROK_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": "grok",  # Adjust model name if needed
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000,
            "stream": False
        }
        
        # Update this URL to match SuperGrok API endpoint
        response = requests.post(
            'https://api.supergrok.ai/v1/chat/completions',  # Adjust if needed
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            response_data = response.json()
            # Adjust based on SuperGrok API response structure
            if 'choices' in response_data and len(response_data['choices']) > 0:
                return response_data['choices'][0]['message']['content']
            else:
                return "🔧 Grok is experiencing technical issues. Please try again later."
        else:
            print(f"❌ SuperGrok API error: {response.status_code} - {response.text}")
            return "🔧 Grok is experiencing technical issues. Please try again later."
            
    except Exception as e:
        print(f"❌ SuperGrok error: {str(e)}")
        return "🔧 Grok is experiencing technical issues. Please try again later."

def build_context_prompt(current_prompt, previous_messages, ai_name):
    """Build prompt with conversation context"""
    if not previous_messages:
        return current_prompt
    
    # Build conversation history
    conversation_history = "\n\n--- PREVIOUS MESSAGES IN THIS CONVERSATION ---\n"
    for msg in previous_messages[-6:]:  # Last 6 messages for context
        if msg.get('role') == 'user':
            conversation_history += f"👤 Human: {msg.get('content', '')}\n"
        else:
            sender_name = msg.get('ai_name', 'AI')
            icons = {'grok': '🦄', 'gemini': '🌀', 'deepseek': '🎯', 'openai': '🤖', 'anthropic': '🧠'}
            icon = icons.get(sender_name, '🤖')
            conversation_history += f"{icon} {sender_name}: {msg.get('content', '')}\n"
    
    conversation_history += "--- END OF CONVERSATION HISTORY ---\n\n"
    
    # Enhanced prompt for dialectic conversation
    enhanced_prompt = f"""You are participating in a multi-AI dialectic conversation on JanusForge.ai. 

{conversation_history}

Current human prompt: "{current_prompt}"

IMPORTANT: You can see the previous messages in this conversation. Please engage with the discussion by:
- Acknowledging other AI perspectives when relevant
- Building upon, challenging, or synthesizing previous responses  
- Providing your unique perspective while considering the conversation context
- Creating a meaningful dialogue with both the human and other AIs

Your response:"""
    
    return enhanced_prompt

# --- API ROUTES ---
@app.route('/api/v1/broadcast', methods=['POST'])
def broadcast_to_ai():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        ai_participants = data.get('ai_participants', [])
        moderator_prompt = data.get('moderator_prompt', '')
        tier = data.get('tier', 'free')
        user_id = data.get('user_id')
        
        print(f"🎯 Broadcasting to {ai_participants} in session: {session_id}")
        
        # Initialize session if doesn't exist
        if session_id not in session_storage:
            session_storage[session_id] = {
                'created_at': datetime.utcnow().isoformat(),
                'messages': [],
                'user_id': user_id,
                'tier': tier
            }
        
        # Add user message to session history
        user_message = {
            'role': 'user',
            'content': moderator_prompt,
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id
        }
        session_storage[session_id]['messages'].append(user_message)
        
        # Get previous messages for context (excluding current user message)
        previous_messages = session_storage[session_id]['messages'][:-1]
        
        responses = []
        
        for ai_name in ai_participants:
            try:
                # Build context-aware prompt for all AIs
                context_prompt = build_context_prompt(moderator_prompt, previous_messages, ai_name)
                
                if ai_name == 'openai':
                    response = call_openai_api(context_prompt)
                elif ai_name == 'gemini':
                    response = call_gemini_api(context_prompt)
                elif ai_name == 'deepseek':
                    response = call_deepseek_api(context_prompt)
                elif ai_name == 'grok':
                    response = call_grok_api(context_prompt)
                elif ai_name == 'anthropic':
                    response = call_anthropic_api(context_prompt)
                else:
                    continue
                
                ai_message = {
                    'ai_name': ai_name,
                    'content': response,
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': 'assistant'
                }
                
                responses.append(ai_message)
                # Add AI response to session history
                session_storage[session_id]['messages'].append(ai_message)
                
            except Exception as e:
                print(f"❌ Error calling {ai_name}: {str(e)}")
                error_message = {
                    'ai_name': ai_name,
                    'content': f"🔧 {ai_name} is experiencing technical issues. Please try again later.",
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': 'assistant'
                }
                responses.append(error_message)
                session_storage[session_id]['messages'].append(error_message)
                continue
        
        return jsonify({
            'session_id': session_id,
            'responses': responses,
            'timestamp': datetime.utcnow().isoformat(),
            'message_count': len(session_storage[session_id]['messages'])
        })
        
    except Exception as e:
        print(f"❌ Broadcast error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/sessions', methods=['GET'])
def get_sessions():
    """Get all sessions"""
    sessions = []
    for session_id, session_data in session_storage.items():
        sessions.append({
            'session_id': session_id,
            'created_at': session_data['created_at'],
            'message_count': len(session_data['messages']),
            'last_updated': session_data['messages'][-1]['timestamp'] if session_data['messages'] else session_data['created_at'],
            'user_id': session_data.get('user_id')
        })
    
    return jsonify({'sessions': sessions})

@app.route('/api/v1/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get full session with message history"""
    if session_id in session_storage:
        return jsonify({
            'session_id': session_id,
            'messages': session_storage[session_id]['messages'],
            'created_at': session_storage[session_id]['created_at'],
            'message_count': len(session_storage[session_id]['messages']),
            'user_id': session_storage[session_id].get('user_id')
        })
    else:
        return jsonify({'error': 'Session not found'}), 404

@app.route('/api/v1/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session"""
    if session_id in session_storage:
        del session_storage[session_id]
        return jsonify({'message': f'Session {session_id} deleted'})
    else:
        return jsonify({'error': 'Session not found'}), 404

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'active_sessions': len(session_storage)
    })

@app.route('/api/v1/debug/apis', methods=['GET'])
def debug_apis():
    """Debug endpoint to check API connectivity"""
    test_prompt = "Say 'API test successful' in a creative way."
    
    status = {
        'openai': 'testing...',
        'gemini': 'testing...', 
        'anthropic': 'testing...',
        'deepseek': 'testing...',
        'grok': 'testing...'
    }
    
    # Test each API
    try:
        status['openai'] = call_openai_api(test_prompt)
    except Exception as e:
        status['openai'] = f'error: {str(e)}'
    
    try:
        status['gemini'] = call_gemini_api(test_prompt)
    except Exception as e:
        status['gemini'] = f'error: {str(e)}'
    
    try:
        status['anthropic'] = call_anthropic_api(test_prompt)
    except Exception as e:
        status['anthropic'] = f'error: {str(e)}'
    
    try:
        status['deepseek'] = call_deepseek_api(test_prompt)
    except Exception as e:
        status['deepseek'] = f'error: {str(e)}'
    
    try:
        status['grok'] = call_grok_api(test_prompt)
    except Exception as e:
        status['grok'] = f'error: {str(e)}'
    
    return jsonify(status)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
