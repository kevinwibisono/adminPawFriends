const express = require("express");
const router = express.Router();
const multer = require("multer");

const firebase = require("firebase");
const firestore = firebase.firestore();

const admin = require("firebase-admin");
const e = require("express");
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

router.get("/listArtikel", async function(req, res){
    var kategoriList = ["Informasi", "Tips & Trik", "Acara", "Komunitas", "Peristiwa", "Cerita Pemilik"];
    var readerList = ["Semua Pemilik", "Pemilik Baru", "Pemilik Berpengalaman"];
    var artikelDBList = await firestore.collection("artikel").orderBy("tanggal", "desc").limit(10).get();
    var artikelList = [];
    artikelDBList.forEach(artikelDB => {
        var artikel = artikelDB._delegate._document;
        var artikelDetails = artikel.data.value.mapValue.fields;
        var newArtikel = {};
        newArtikel["id"] = artikel.key.path.segments[6];
        newArtikel["kategori"] = kategoriList[artikelDetails.kategori.integerValue];
        newArtikel["reader"] = readerList[artikelDetails.target_pembaca.integerValue];
        newArtikel["link"] = artikelDetails.link.stringValue;
        newArtikel["like"] = artikelDetails.like.integerValue;
        newArtikel["judul"] = artikelDetails.judul.stringValue;
        newArtikel["tanggal"] = new Date(parseInt(artikelDetails.tanggal.timestampValue.seconds) * 1000).toISOString().substr(0, 10)
        artikelList.push(newArtikel);
    });

    res.render("artikel", {artikelList: artikelList});
});


router.get("/toAddArtikel", function(req, res){
    res.render("addartikel", {artikel: null, error: null});
});

router.post("/addArtikel", function(req, res){
    upload(req,res, async function (err){
        var judul = req.body.judul;
        var isi = req.body.isi;
        var penulis = req.body.penulis;
        var link = req.body.link;
        var kategori = parseInt(req.body.kategori);
        var target = parseInt(req.body.target);
        var topik = "";
        var topicsCB = [req.body.topik_anjing, req.body.topik_kucing, req.body.topik_kelinci, req.body.topik_burung, req.body.topik_ikan, 
            req.body.topik_hamster, req.body.topik_reptil, req.body.topik_lainnya];
        var cbIndex = 0;
        topicsCB.forEach(checkbox => {
            if(checkbox == "true"){
                if(topik == ""){
                    topik += ""+cbIndex;
                }
                else{
                    topik += "|"+cbIndex;
                }
            }
            cbIndex += 1;
        });

        firebaseStorageBucket.upload('./uploads/'+req.file.originalname, (err, file) =>{
            if (err) { return console.error(err); }
            let publicUrl = `https://firebasestorage.googleapis.com/v0/b/pawfriends-a5086.appspot.com/o/${file.metadata.name}?alt=media`;
            firestore.collection("artikel").add({
                judul: judul,
                isi: isi,
                gambar: publicUrl,
                link: link,
                nama_penulis: penulis,
                topik_hewan: topik,
                kategori: kategori,
                target_pembaca: target,
                like: 0,
                tanggal: new Date()
            })
            .then((docRef) => {
                res.redirect("https://pawfriends-admin.herokuapp.com/route/artikel/listArtikel");
            })
            .catch((error) => {
                res.send(error);
            });

        });

        
    });
});

router.post("/updateArtikel", function(req, res){
    upload(req,res, async function (err){
        if(req.body.id == undefined){
            res.send("artikel tidak ditemukan");
        }
        else{
            var id = req.body.id;
            var judul = req.body.judul;
            var isi = req.body.isi;
            var penulis = req.body.penulis;
            var link = req.body.link;
            var kategori = parseInt(req.body.kategori);
            var target = parseInt(req.body.target);
            var topik = "";
            var topicsCB = [req.body.topik_anjing, req.body.topik_kucing, req.body.topik_kelinci, req.body.topik_burung, req.body.topik_ikan, 
                req.body.topik_hamster, req.body.topik_reptil, req.body.topik_lainnya];
            var cbIndex = 0;
            topicsCB.forEach(checkbox => {
                if(checkbox == "true"){
                    if(topik == ""){
                        topik += ""+cbIndex;
                    }
                    else{
                        topik += "|"+cbIndex;
                    }
                }
                cbIndex += 1;
            });

            if(req.file != undefined){
                firebaseStorageBucket.upload('./uploads/'+req.file.originalname, (err, file) =>{
                    if (err) { return console.error(err); }
                    let publicUrl = `https://firebasestorage.googleapis.com/v0/b/pawfriends-a5086.appspot.com/o/${file.metadata.name}?alt=media`;
                    firestore.collection("artikel").doc(id).set({
                        judul: judul,
                        isi: isi,
                        gambar: publicUrl,
                        link: link,
                        nama_penulis: penulis,
                        topik_hewan: topik,
                        kategori: kategori,
                        target_pembaca: target
                    }, {merge : true})
                    .then((docRef) => {
                        res.redirect("https://pawfriends-admin.herokuapp.com/route/artikel/listArtikel");
                    })
                    .catch((error) => {
                        res.send(error);
                    });
        
                });
            }
            else{
                firestore.collection("artikel").doc(id).set({
                    judul: judul,
                    isi: isi,
                    link: link,
                    nama_penulis: penulis,
                    topik_hewan: topik,
                    kategori: kategori,
                    target_pembaca: target
                }, {merge : true})
                .then((docRef) => {
                    res.redirect("https://pawfriends-admin.herokuapp.com/route/artikel/listArtikel");
                })
                .catch((error) => {
                    res.send(error);
                });
            }
        }
    });
});

router.get("/toUpdateArtikel/:id", async function(req, res){
    var artikelDB = await firestore.collection("artikel").doc(req.params.id).get();
    var artikelDoc = artikelDB._delegate._document;
    if(artikelDoc != null){
        var artikelDetails = artikelDoc.data.value.mapValue.fields;

        var artikel = {};
        artikel["id"] = artikelDoc.key.path.segments[6];
        artikel["judul"] = artikelDetails.judul.stringValue;
        artikel["kategori"] = artikelDetails.kategori.integerValue;
        artikel["target"] = artikelDetails.target_pembaca.integerValue;
        artikel["hewan"] = artikelDetails.topik_hewan.stringValue;
        artikel["penulis"] = artikelDetails.nama_penulis.stringValue;
        artikel["link"] = artikelDetails.link.stringValue;
        artikel["isi"] = artikelDetails.isi.stringValue;
        artikel["gambar"] = artikelDetails.gambar.stringValue;
        artikel["topik"] = artikelDetails.topik_hewan.stringValue;

        res.render("addartikel", {artikel: artikel});
    }
    else{
        res.send("artikel tidak ditemukan")
    }
});

router.get("/deleteArtikel/:id", function(req, res){
    firestore.collection("artikel").doc(req.params.id).delete()
    .then(() => {
        res.redirect("https://pawfriends-admin.herokuapp.com/route/artikel/listArtikel");
    })
    .catch((error) => {
        res.send(error);
    });
});

module.exports = router;