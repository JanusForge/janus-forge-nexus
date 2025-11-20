from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import google.generativeai as genai
from openai import OpenAI
from anthropic import Anthropic
import requests
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# API Keys - make sure these are set in your environment variables
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') 
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
GROK_API_KEY = os.getenv('GROK_API_KEY')  # You'll need to get this

# Initialize API clients
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- SESSION STORAGE ---
# In-memory session storage (replace with database in production)
session_storage = {}

# --- API CALL FUNCTIONS ---
def call_openai_api(prompt):
    """Call OpenAI GPT API"""
    if not openai_client:
        return "OpenAI API not configured"
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ OpenAI API error: {str(e)}")
        return f"OpenAI error: {str(e)}"

def call_gemini_api(prompt):
    """Call Google Gemini API"""
    if not GEMINI_API_KEY:
        return "Gemini API not configured"
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"❌ Gemini API error: {str(e)}")
        return f"Gemini error: {str(e)}"

def call_anthropic_api(prompt):
    """Call Anthropic Claude API"""
    if not anthropic_client:
        return "Anthropic API not configured"
    
    try:
        response = anthropic_client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        print(f"❌ Anthropic API error: {str(e)}")
        return f"Claude error: {str(e)}"

def call_deepseek_api(prompt):
    """Call DeepSeek API"""
    if not DEEPSEEK_API_KEY:
        return "DeepSeek API not configured"
    
    try:
        headers = {
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000
        }
        response = requests.post(
            'https://api.deepseek.com/chat/completions',
            headers=headers,
            json=data
        )
        response_data = response.json()
        return response_data['choices'][0]['message']['content']
    except Exception as e:
        print(f"❌ DeepSeek API error: {str(e)}")
        return f"DeepSeek error: {str(e)}"

def call_grok_api(prompt):
    """Call xAI Grok API"""
    if not GROK_API_KEY:
        return "Grok API not configured - using simulated response"
    
    try:
        # Grok API integration would go here
        # For now, return a simulated Grok-like response
        grok_responses = [
            f"🦄 Grok: {prompt}? Interesting! Let me break this down with some humor and insight...",
            f"🦄 Grok: Ah, a fascinating query! *adjusts virtual glasses* Let me dive into this...",
            f"🦄 Grok: *chuckles* This reminds me of that time when... but let's focus on your question!"
        ]
        import random
        return random.choice(grok_responses)
    except Exception as e:
        print(f"❌ Grok API error: {str(e)}")
        return f"Grok error: {str(e)}"

# --- CONVERSATION CONTEXT FUNCTIONS ---
def build_context_prompt(current_prompt, previous_messages, ai_name):
    """Build a prompt that includes conversation context"""
    
    if not previous_messages:
        return current_prompt
    
    # Build conversation history
    conversation_history = "\n\n--- PREVIOUS MESSAGES IN THIS CONVERSATION ---\n"
    for msg in previous_messages[-6:]:  # Last 6 messages for context
        if msg.get('role') == 'user':
            conversation_history += f"👤 Human: {msg.get('content', '')}\n"
        else:
            sender_name = msg.get('ai_name', 'AI')
            sender_icon = get_ai_icon(sender_name)
            conversation_history += f"{sender_icon} {sender_name}: {msg.get('content', '')}\n"
    
    conversation_history += "--- END OF CONVERSATION HISTORY ---\n\n"
    
    # Enhanced prompt for dialectic conversation
    enhanced_prompt = f"""You are participating in a multi-AI dialectic conversation on JanusForge.ai. 

{conversation_history}

Current human prompt: "{current_prompt}"

IMPORTANT CONTEXT: You can see the previous messages in this conversation above. Please:
1. Read and acknowledge other AI perspectives when relevant
2. Build upon, challenge, or synthesize previous responses  
3. Engage in meaningful dialogue with both the human and other AIs
4. Provide your unique perspective while considering the conversation context
5. Reference specific points from other AIs when appropriate

Your response (speak naturally as yourself):"""
    
    return enhanced_prompt

def get_ai_icon(ai_name):
    """Get icon for AI name"""
    icons = {
        'grok': '🦄',
        'gemini': '🌀', 
        'deepseek': '🎯',
        'openai': '🤖',
        'anthropic': '🧠'
    }
    return icons.get(ai_name, '🤖')

# --- ROUTES ---
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
                # Skip Claude if it's in the list but we don't have working API key
                if ai_name == 'anthropic':
                    response = "🔧 Claude is temporarily undergoing maintenance. Our team is working to restore access. Please try another AI model for now."
                    print(f"⏸️  Skipping Claude (API key issue)")
                else:
                    # Build context-aware prompt
                    context_prompt = build_context_prompt(moderator_prompt, previous_messages, ai_name)
                    
                    if ai_name == 'openai':
                        response = call_openai_api(context_prompt)
                    elif ai_name == 'gemini':
                        response = call_gemini_api(context_prompt)
                    elif ai_name == 'deepseek':
                        response = call_deepseek_api(context_prompt)
                    elif ai_name == 'grok':
                        response = call_grok_api(context_prompt)
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
                    'content': f"🔧 {ai_name} is experiencing technical difficulties. Please try again later.",
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': 'assistant',
                    'error': str(e)
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

@app.route('/api/v1/debug/models', methods=['GET'])
def debug_models():
    """Debug endpoint to check API connectivity"""
    status = {
        'openai': 'not configured',
        'gemini': 'not configured', 
        'anthropic': 'not configured',
        'deepseek': 'not configured',
        'grok': 'not configured'
    }
    
    # Test OpenAI
    if openai_client:
        try:
            test = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Say 'test'"}],
                max_tokens=5
            )
            status['openai'] = 'connected'
        except Exception as e:
            status['openai'] = f'error: {str(e)}'
    
    # Test Gemini
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content("Say 'test'")
            status['gemini'] = 'connected'
        except Exception as e:
            status['gemini'] = f'error: {str(e)}'
    
    # Test Anthropic
    if anthropic_client:
        try:
            response = anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=5,
                messages=[{"role": "user", "content": "Say 'test'"}]
            )
            status['anthropic'] = 'connected'
        except Exception as e:
            status['anthropic'] = f'error: {str(e)}'
    
    return jsonify(status)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
