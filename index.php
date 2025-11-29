<?php
if(isset($_GET["num"])){
    $num = $_GET["num"];
    $url = "https://numapi.anshapi.workers.dev?num=".$num;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0");
    $response = curl_exec($ch);
    curl_close($ch);

    header("Content-Type: application/json");
    echo $response;
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
<title>Mobile Tracker</title>

<style>
body{background:#f4f4f4;font-family:Arial;margin:0;}
.box{max-width:650px;background:white;margin:25px auto;padding:25px;
border-radius:12px;box-shadow:0 3px 15px rgba(0,0,0,0.25);}
input{width:100%;padding:14px;border:1px solid #ccc;border-radius:8px;font-size:18px;}
button{width:100%;padding:15px;background:#0d1b3d;color:white;border:none;border-radius:8px;
font-size:18px;margin-top:10px;cursor:pointer;}
button:hover{background:#091229;}
#info{white-space:pre-wrap;margin-top:15px;font-size:15px;background:white;
padding:18px;border-radius:10px;display:none;}
#map{height:350px;border-radius:12px;margin-top:20px;display:none;}
.loader{
display:none;margin:18px auto;width:55px;height:55px;border:6px solid #ccc;
border-top:6px solid #0d1b3d;border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{100%{transform:rotate(360deg);}}
</style>

<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY_HERE"></script>

</head>

<body>

<div class="box">
<h2>📍 Mobile Number Demo</h2>

<input id="number" placeholder="Enter 10 digit number">
<button onclick="startTrack()">Track Now</button>

<div id="loader" class="loader"></div>

<div id="info"></div>
<div id="map"></div>
</div>

<script>

let targetNumber = "";

// START TRACKING
function startTrack(){
    let num = document.getElementById("number").value;

    if(num.length!==10 || isNaN(num)){
        alert("Enter valid 10 digit number");
        return;
    }

    targetNumber = num;

    document.getElementById("loader").style.display="block";
    document.getElementById("info").style.display="none";
    document.getElementById("map").style.display="none";

    fetch("?num="+num)
    .then(r=>r.json())
    .then(api=>{
        document.getElementById("loader").style.display="none";

        let info = api.result[0];
        showFormattedInfo(info);

        let cleanedAddress = cleanAddress(info.address);

        geocode(cleanedAddress);
    });
}


// FORMAT OUTPUT TEXT
function showFormattedInfo(x){

    let text = `
✅ Information Found

🔢 Target Number: ${targetNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Record:
• 👤 Full Name: ${x.name}
• 👨‍🦳 Father Name: ${x.father_name}
• 📱 Mobile Number: ${x.mobile}
• 🆔 Aadhar Number: ${x.id_number}
• 🏠 Complete Address: ${x.address}
• 📞 Alternate Mobile: ${x.alt_mobile}
• 📍 Telecom Circle: ${x.circle}
• 🔢 User ID: ${x.id}

──────────────────────────────

💻 Bot by DSR OGGY
📱 Join: @DSRAbout
`;

    document.getElementById("info").innerText = text;
    document.getElementById("info").style.display = "block";
}


// ADDRESS CLEANER
function cleanAddress(a){
    a = a.replace(/S\/O|W\/O|D\/O/gi," ");
    a = a.replace(/[^\w\s]/g," ");
    a = a.replace(/\s+/g," ").trim();
    return a;
}


// GOOGLE MAP GEOCODING
function geocode(address){

    let geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: address }, function(results, status){

        if(status !== "OK"){
            alert("Unable to locate: "+address);
            return;
        }

        let location = results[0].geometry.location;

        showGoogleMap(location.lat(), location.lng(), address);
    });
}


// SHOW GOOGLE MAP
function showGoogleMap(lat, lng, address){

    document.getElementById("map").style.display="block";

    let map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        mapTypeId: "hybrid"
    });

    let marker = new google.maps.Marker({
        position: { lat: parseFloat(lat), lng: parseFloat(lng) },
        map: map
    });

    let circle = new google.maps.Circle({
        strokeColor: "#7a00ff",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#7a00ff",
        fillOpacity: 0.35,
        map: map,
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: 1500
    });
}

</script>

</body>
</html>