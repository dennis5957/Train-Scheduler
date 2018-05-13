     // Initialize Firebase
     var config = {
         apiKey: "AIzaSyC6NuoErb6-dYiBBoQ9JIEy1EAeU_ssW2A",
         authDomain: "dennis05-96a31.firebaseapp.com",
         databaseURL: "https://dennis05-96a31.firebaseio.com",
         projectId: "dennis05-96a31",
         storageBucket: "dennis05-96a31.appspot.com",
         messagingSenderId: "736488260775"
     };

     firebase.initializeApp(config);
     var db = firebase.database();
     var schedRef = db.ref("/scheduled");

     var scheduledTrains = [];

     var updateTimer;
     var updateRate = 10000;

     $(document).ready(function () {
         $("#updateRate").val(updateRate / 1000);

         $("#sec").text(updateRate / 1000);

         updateLoop();
     });

     $("#updateRate").on("input", function () {
         var rangeValue = $(this).val();
         $("#sec").text(rangeValue);
     });

     $("#updateRate").on("change", function (event) {
         var rangeValue = $(this).val();
         console.log("Range Input Value Changed To: " + rangeValue);
         updateRate = rangeValue * 1000;
         $("#sec").text(rangeValue);
         restartUpdate();
     });

     $("#firstTime").val(moment().format("HH:mm"));

     // listen for any changes to scheduled node in firbase DB
     schedRef.on("value", function (snapshot) {
         refreshScheduledList(snapshot);
     });


     $("#trainForm").on("submit", function (event) {
         event.preventDefault();
         var name = $("#trainName").val().trim();
         var dest = $("#destination").val().trim();
         var time = $("#firstTime").val().trim();
         var freq = $("#frequency").val().trim();

         // console.log(name, dest, time, freq);
         var momentTime = moment(`${moment().format('YYYY-MM-DD')}T${time}:00.000`).format(
             "YYYY-MM-DDTHH:mm:ss.SSSS");
         // Code for the push
         var newTrainKey = schedRef.push({
             name: name,
             dest: dest,
             time: momentTime,
             freq: freq,
             dateAdded: firebase.database.ServerValue.TIMESTAMP
         });

         console.log("This is the new train key: " + newTrainKey);
     });

     function onDeleteClicked(aButton) {
         var key = $(aButton).data("key");
         console.log("delete-button clicked, key: " + key);
         var train = `scheduled/${key}`;
         var selectedRow = $(aButton).closest(".row");
         $(selectedRow).animate({
             "margin-left": "-900px",
             "margin-right": "900px",
             height: "0px",
             opacity: 0.0
         }, 400, function () {
             console.log("animated");
             db.ref(train).remove();
         });
     }

     function restartUpdate() {
         clearTimeout(updateTimer);
         updateLoop();
     }

     function updateLoop() {
         updateTimer = setTimeout(function () {
             schedRef.once("value").then(function (snapshot) {
                 refreshScheduledList(snapshot);
                 updateLoop();
             });
         }, updateRate);
     }


     function refreshScheduledList(aScheduledTrainsSnapshot) {
         scheduledTrains = snapshotToArray(aScheduledTrainsSnapshot);
         console.log(scheduledTrains);
         var html = "";
         scheduledTrains.forEach(function (t) {
             html +=
                 `<div id="${t.key}" class="list-group-item">
                        <div class="row">
                            <div class="col-1 text-center"><button class="delete-button" data-key="${t.key}" type="button" onclick="onDeleteClicked(this)"><i class="fas fa-arrow-circle-left"></i></button></div>
                            <div class="col-3 text-center">${t.name}</div>
                            <div class="col-3 text-center">${t.dest}</div>
                            <div class="col-1 text-center">${t.freq}</div>
                            <div class="col-2 text-center">${t.time}</div>
                            <div class="col-2 text-center" ml-2>${t.remaining}</div>
                        </div>
                    </div>`;
         });

         $("#trackedTrains").html(html);
     }


     function snapshotToArray(aSnapshot) {
         var returnArr = [];
         aSnapshot.forEach(function (childSnapshot) {
             var item = childSnapshot.val();
             item.key = childSnapshot.key;
             var currentTime = moment();
             var prevArrival = moment(item.time);
             //console.log(currentTime, prevTime);
             var nextArrival;
             if (currentTime.isAfter(prevArrival)) {
                 //console.log("it's past time: " + prevArrival.format("HH:mm"));
                 nextArrival = prevArrival.add(item.freq, "minutes");
                 var ref = `scheduled/${childSnapshot.key}/`;
                 //console.log(ref);
                 db.ref(ref).child("time").set(nextArrival.format("YYYY-MM-DDTHH:mm:ss.SSSS"));
             } else {
                 //console.log("it's not time yet: " + prevArrival.format("h:mm A"));
                 nextArrival = prevArrival;
             }

             // console.log(nextArrival);
             var secondsAway = nextArrival.diff(currentTime, "seconds");
             var minutesAway = secondsAway > 60 ? (secondsAway / 60).toFixed(0) : "< 1";
             //Math.max( Math.round(number * 10) / 10, 2.8 ).toFixed(2)

             returnArr.push({
                 key: item.key,
                 name: item.name,
                 dest: item.dest,
                 freq: item.freq,
                 time: nextArrival.format("h:mm A"),
                 remaining: minutesAway
             });

         });
         return returnArr.sort(function (a, b) {
             return a.time > b.time;
         });
     }