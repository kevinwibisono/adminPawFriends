const express = require("express");
const multer = require("multer");
const router = express.Router();

const firebase = require("firebase");
const firestore = firebase.firestore();

const admin = require("firebase-admin");
const firebaseStorageBucket = admin.storage().bucket();

const storage=multer.diskStorage({
    destination:'./uploads',
    filename:function(req,file,cb){
        filename = file.originalname;
        cb(null,file.originalname);
    }
});
const upload=multer({
    storage:storage
}).single('gambar');

router.get("/listPenarikan", async function(req, res){
    var query = firestore.collection("riwayat_saldo").where("jenis", "==", 2).where("bukti_transfer", "==", "").orderBy("tanggal", "asc");
    if(req.query.bukti != undefined){
        //cari yang buktinya sdh ada dan diupload
        var query = firestore.collection("riwayat_saldo").where("jenis", "==", 2).where("bukti_transfer", "!=", "").orderBy("bukti_transfer", "asc").orderBy("tanggal", "asc");
    }
    var bankList = ["Artha Graha Internasional", "Bank Central Asia", "Bank Negara Indonesia", "CIMB Niaga", "Mandiri"];
    var saldoTarikDBList = await query.get();
    var saldoTarikList = [];
    saldoTarikDBList.forEach(async (saldoTarikDB) => {
        var penarikan = saldoTarikDB._delegate._document;
        var penarikanDetails = penarikan.data.value.mapValue.fields;
        var newPenarikan = {};
        newPenarikan["id"] = penarikan.key.path.segments[6];
        newPenarikan["nama"] = penarikanDetails.nama.stringValue;
        newPenarikan["jenis_rek"] = bankList[penarikanDetails.jenis.integerValue];
        newPenarikan["tanggal"] = new Date(parseInt(penarikanDetails.tanggal.timestampValue.seconds) * 1000).toISOString().substr(0,10);
        saldoTarikList.push(newPenarikan);
    });

    res.render("penarikan", {saldoTarikList: saldoTarikList});
});

router.get("/toPenarikanDetail/:id", async function(req, res){
    var bankList = ["Artha Graha Internasional", "Bank Central Asia", "Bank Negara Indonesia", "CIMB Niaga", "Mandiri"];
    var penarikanDB = await firestore.collection("riwayat_saldo").doc(req.params.id).get();
    var penarikanDoc = penarikanDB._delegate._document;
    if(penarikanDoc != null){
        var penarikanDetails = penarikanDoc.data.value.mapValue.fields;
        var penarikan = {};
        penarikan["id"] = penarikanDoc.key.path.segments[6];
        penarikan["nama"] = penarikanDetails.nama.stringValue;
        penarikan["bukti"] = penarikanDetails.bukti_transfer.stringValue;
        penarikan["jenis_rek"] = bankList[penarikanDetails.jenis_rek.integerValue];
        penarikan["no_rek"] = penarikanDetails.no_rek.stringValue;
        penarikan["nama_rek"] = penarikanDetails.nama_rek.stringValue;
        penarikan["tanggal"] = new Date(parseInt(penarikanDetails.tanggal.timestampValue.seconds) * 1000).toISOString().substr(0,10);

        res.render("uploadPenarikan", {penarikan: penarikan});
    }
    else{
        res.send("penarikan tidak ditemukan");
    }
});

router.post("/uploadBuktiTrf", async function(req, res){
    upload(req,res, async function (err){
        if(req.file != undefined){
            if(req.body.id == undefined){
                res.send("penarikan tidak ditemukan");
            }
            else{
                var penarikanDoc = await firestore.collection("riwayat_saldo").doc(req.body.id).get();
                var penarikan = penarikanDoc._delegate._document.data.value.mapValue.fields;

                let message = {
                    notification: {
                        title: "Pengajuan Penarikan Saldo Telah Disetujui",
                        body: "Pengajuan Penarikan Saldomu Telah Disetujui Oleh Admin PawFriends"
                    },
                    topic: penarikan.no_hp.stringValue
                }
            
                admin.messaging().send(message);

                firebaseStorageBucket.upload('./uploads/'+req.file.originalname, (err, file) =>{
                    if (err) { return console.error(err); }
                    let publicUrl = `https://firebasestorage.googleapis.com/v0/b/pawfriends-a5086.appspot.com/o/${file.metadata.name}?alt=media`;
                    firestore.collection("riwayat_saldo").doc(req.body.id).set({
                        bukti_transfer: publicUrl
                    }, {merge: true})
                    .then((docRef) => {
                        res.redirect("https://pawfriends-admin.herokuapp.com/route/penarikan/listPenarikan");
                    })
                    .catch((error) => {
                        res.send(error);
                    });
        
                });
            }
        }
        else{
            res.redirect("https://pawfriends-admin.herokuapp.com/route/penarikan/listPenarikan");
        }
    });
});



module.exports = router;