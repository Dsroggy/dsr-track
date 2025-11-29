from flask import Flask, request, jsonify, render_template_string
import requests
import threading
import webbrowser
import time

app = Flask(__name__)

# HTML Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Mobile Tracker - ANISH EXPLOITS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{
            background:white;
            font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height:100vh;
            padding:20px;
        }
        .glass-box{
            max-width:750px;
            background:white;
            margin:20px auto;
            padding:30px;
            border-radius:20px;
            border:1px solid #ddd;
        }
        .header{text-align:center;margin-bottom:30px;}
        .header h2{color:black;font-size:2.2em;margin-bottom:10px;font-weight:700;}
        .header p{color:#444;font-size:1.1em;}
        .input-group{margin-bottom:25px;}
        .input-group input{
            width:100%;
            padding:18px 20px;
            background:white;
            border:2px solid #bbb;
            border-radius:15px;
            font-size:18px;color:black;
        }
        .input-group input::placeholder{color:#777;}
        .glow-button{
            width:100%;padding:18px;background:black;border:none;
            border-radius:15px;color:white;font-size:18px;cursor:pointer;
            transition:0.3s;
        }
        .glow-button:hover{
            background:#333;
            transform:translateY(-2px);
        }
        .loader{
            display:none;margin:25px auto;width:60px;height:60px;
            border:4px solid #ccc;border-top:4px solid black;border-radius:50%;
            animation:spin 1s linear infinite;
        }
        @keyframes spin{100%{transform:rotate(360deg);}}
        #info{
            margin-top:25px;font-size:15px;background:#f8f9fa;
            padding:25px;border-radius:15px;display:none;color:black;border:1px solid #ddd;
            line-height:1.6;
        }
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            border: 1px solid #c3e6cb;
            display: none;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            border: 1px solid #f5c6cb;
            display: none;
        }
        .info-item {
            margin: 12px 0;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #007bff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
        #atomicPopup {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: white;
            color: black;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: 18px;
            padding: 20px;
            z-index: 99999;
            border: 2px solid black;
        }
    </style>
</head>
<body>
    <div id="atomicPopup">
        <div>
            <h2 style="margin-bottom:15px; color:black;">⚠️ Disclaimer</h2>
            <p style="color:black;">
                Ye website sirf educational aur legal purposes ke liye banayi gayi hai.
                Yaha dikhayi jane wali saari information publicly available sources par based hai.
                Is website ka istemaal kisi vyakti ko pareshan karne, stalk karne, dhamkane,
                nuksan pahunchane ya kisi bhi illegal activity ke liye karna mana hai.
                Developer user ke kisi bhi misuse ya illegal kaam ka zimmedar nahi hoga.
                Agar aap in terms se sehmat nahi hain, to kripya website ka istemaal na karein.
            </p>
        </div>
    </div>
    
    <div class="glass-box">
        <div class="header">
            <h2>Mobile Number Tracker</h2>
            <p>Powered by ANISH EXPLOITS</p>
        </div>
        <div class="input-group">
            <input id="number" placeholder="Enter 10 digit mobile number..." value="8084534266">
        </div>
        <button class="glow-button" onclick="startTrack()">Track Now</button>
        <div id="loader" class="loader"></div>
        
        <div id="success" class="success-message"></div>
        <div id="error" class="error-message"></div>
        <div id="info"></div>
    </div>

    <script>
    function startTrack(){
        let num = document.getElementById("number").value.trim();
        
        if(num.length !== 10 || isNaN(num)){
            showError("Please enter a valid 10 digit mobile number");
            return;
        }
        
        // Reset UI
        document.getElementById("loader").style.display = "block";
        document.getElementById("info").style.display = "none";
        document.getElementById("error").style.display = "none";
        document.getElementById("success").style.display = "none";
        
        // Fetch data from API
        fetch('/track?num=' + num)
        .then(response => {
            if(!response.ok){
                throw new Error('Network error: ' + response.status);
            }
            return response.json();
        })
        .then(apiData => {
            document.getElementById("loader").style.display = "none";
            
            console.log("API Response:", apiData);
            
            // Process API response
            if(apiData.success && apiData.data){
                let userData = apiData.data;
                if(hasValidData(userData)) {
                    showSuccess("✅ Information found successfully!");
                    displayUserInfo(userData);
                } else {
                    showError("❌ No valid information found for this number");
                }
            } else if(apiData.data) {
                let userData = apiData.data;
                if(hasValidData(userData)) {
                    showSuccess("✅ Information found successfully!");
                    displayUserInfo(userData);
                } else {
                    showError("❌ No valid information found for this number");
                }
            } else if(apiData.message) {
                showError(apiData.message);
            } else {
                showError("❌ No information found for this mobile number");
            }
        })
        .catch(error => {
            document.getElementById("loader").style.display = "none";
            console.error("Error:", error);
            showError("❌ Error fetching data: " + error.message);
        });
    }
    
    function hasValidData(data) {
        if (!data) return false;
        const fields = ['name', 'mobile', 'email', 'address', 'city', 'state', 'company'];
        return fields.some(field => data[field] && data[field] !== 'N/A' && data[field] !== 'null');
    }
    
    function displayUserInfo(data) {
        let infoHTML = `
        <div class="info-header">
            <h3 style="margin: 0;">📱 INFORMATION FOUND</h3>
        </div>
        
        <div class="info-item">
            <strong>🎯 Target Number:</strong> ${document.getElementById("number").value}
        </div>
        `;
        
        // Display all available fields
        const fields = [
            {key: 'name', label: '👤 Name', emoji: '👤'},
            {key: 'father_name', label: '👨‍👦 Father Name', emoji: '👨‍👦'},
            {key: 'mobile', label: '📞 Mobile', emoji: '📞'},
            {key: 'alt_mobile', label: '📱 Alternate Mobile', emoji: '📱'},
            {key: 'email', label: '📧 Email', emoji: '📧'},
            {key: 'company', label: '🏢 Company', emoji: '🏢'},
            {key: 'address', label: '🏡 Address', emoji: '🏡'},
            {key: 'city', label: '🏙️ City', emoji: '🏙️'},
            {key: 'state', label: '📍 State', emoji: '📍'},
            {key: 'pincode', label: '📮 Pincode', emoji: '📮'},
            {key: 'id_number', label: '🆔 Aadhar Number', emoji: '🆔'},
            {key: 'circle', label: '📡 Circle', emoji: '📡'},
            {key: 'id', label: '🪪 ID', emoji: '🪪'}
        ];
        
        let hasData = false;
        fields.forEach(field => {
            if (data[field.key] && data[field.key] !== 'N/A' && data[field.key] !== 'null') {
                infoHTML += `
                <div class="info-item">
                    <strong>${field.emoji} ${field.label}:</strong> ${data[field.key]}
                </div>
                `;
                hasData = true;
            }
        });
        
        if (!hasData) {
            showError("❌ No valid data found in response");
            return;
        }
        
        infoHTML += `
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 8px;">
            <strong>⚡ Powered by ANISH EXPLOITS</strong>
        </div>
        `;
        
        document.getElementById("info").innerHTML = infoHTML;
        document.getElementById("info").style.display = "block";
    }
    
    function showSuccess(message) {
        document.getElementById("success").innerText = message;
        document.getElementById("success").style.display = "block";
    }
    
    function showError(message) {
        document.getElementById("error").innerText = message;
        document.getElementById("error").style.display = "block";
    }
    
    // Initialize
    window.onload = function() {
        document.getElementById("number").value = "8084534266";
        
        // Hide disclaimer after 3 seconds
        setTimeout(function(){
            document.getElementById("atomicPopup").style.display = "none";
        }, 3000);
        
        // Enter key support
        document.getElementById("number").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                startTrack();
            }
        });
    }
    </script>
</body>
</html>
'''

@app.route('/')
def home():
    return render_template_string(HTML_TEMPLATE)

@app.route('/track')
def track():
    num = request.args.get('num')
    if not num or len(num) != 10 or not num.isdigit():
        return jsonify({"error": "Invalid mobile number"}), 400
    
    try:
        # Call SPLEXXO API
        api_url = f"https://splexxo-bhai.vercel.app/api/seller?mobile={num}&key=SPLEXXO"
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        
        api_data = response.json()
        return jsonify(api_data)
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"API request failed: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

def open_browser():
    """Auto open browser after 2 seconds"""
    time.sleep(2)
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == '__main__':
    print("🚀 Mobile Tracker Starting...")
    print("📱 Powered by ANISH EXPLOITS")
    print("🌐 Server will start at: http://127.0.0.1:5000")
    print("⏳ Please wait...")
    
    # Start browser in background thread
    threading.Thread(target=open_browser).start()
    
    # Run Flask app
    app.run(host='127.0.0.1', port=5000, debug=False)