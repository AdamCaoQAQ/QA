const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cookieParser = require("cookie-parser");
// 设置图片上传路径
const multer = require("multer");
// const upload = multer({ dest: 'users/avatar' });
const storage = multer.diskStorage({
     //设置上传后文件路径，uploads文件夹会自动创建。
        destination: function (req, file, callback) {
            callback(null, "static/avatar/")
       },
     //给上传文件重命名，获取添加后缀名
      filename: function (req, file, callback) {
          var userName = req.cookies.userName;
          callback(null, `${userName}.jpg`);
      }
 });
 const upload = multer({
     storage: storage
});
const app = express();
app.use(express.static("static"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());

// 注册接口
app.post("/user/register",function (req, res) {
    var userName = req.body.userName;
    // 组合文件路径
    var filePath = "users/" + userName + ".txt";
    // var filePath = `users/${userName}.txt`;
    fs.exists(filePath,function (isExist) {
        if(isExist){
            res.status(200).json({result:0, msg:"该用户名已被注册"});
        }else {
            var userMsg = {
                psw: req.body.psw,
                email: req.body.email,
                sex: req.body.sex,
                lesson: req.body.lesson
            }
            fs.appendFile(filePath, JSON.stringify(userMsg), function (error) {
                if(error){
                    res.status(500).json({result:0, msg:"服务器错误error code 001"});
                }else {
                    res.status(200).json({result:1, msg:"注册成功"});
                }
            })
        }
    });

});

// 登录接口
app.post("/user/login",function (req, res) {
    var userName = req.body.userName;
    // 组合文件路径
    var filePath = "users/" + userName + ".txt";
    // var filePath = `users/${userName}.txt`;
    fs.exists(filePath,function (isExist) {
        if(isExist){
            //用户名存在,即代表用户名正确

            //接下来读取该文件
            fs.readFile(filePath,function(err, data){
                if(err){
                    res.status(500).json({result:0,msg:"服务器错误error code 002"});
                }else{
                    // 数据转化
                    data = JSON.parse(data);
                    var psw = data.psw[0];
                    if(psw == req.body.psw){
                        //密码正确,登录成功
                        //登录成功之后把用户名保存在cookie中,退出登录之后在清除该cookie.
						//该cookie会被放在响应头发送给浏览器,浏览器读取后会保存在浏览器的cookie
						res.cookie("userName", userName);
                        res.status(200).json({result:1,msg:"登录成功!"});
                    }
                    else{
                        res.status(200).json({result:0,msg:"密码出错了!"});
                    }
                }
            });
        }else {
            res.status(200).json({result:0, msg:"账号不存在"});
        }
    });

});

app.get("/user/logout", function (req, res) {
    res.clearCookie("userName");
    res.status(200).json({result:1,msg:"退出成功!"});
})

// TODO: 提问接口
app.post("/user/askQuestion", (req, res) => {

	//将提问的每一个问题 单独 保存在一个文件中，文件名是提问的时间，文件内的内容是该问题相关的用户和时间信息，还有该问题的所有回复
	var content = req.body.content;
	var userName = req.body.userName;
	var times = new Date().getTime();
	console.log(req.headers);
	console.log(req.headers.cookie);
	var msgOpntions = {
		userName: userName, //用户
		content: content, //提问内容
		ip: req.ip, //用户ip
		date: times, //提问的时间
		reply: [] //该提问的所有回复
	}

	var filePath = `allQuestions/${times}.txt`;
	fs.exists("allQuestions", (isExists) => {
		if(!isExists) {
			fs.mkdirSync("allQuestions");
		}
		fs.appendFile(filePath, JSON.stringify(msgOpntions), (err) => {
			if(err) {
				res.status(200).json({
					result: 0,
					msg: "提问失败!"
				});
			} else {
				res.status(200).json({
					result: 1,
					msg: "提问成功!"
				});
			}
		});
	});
});

// TODO: 获取所有提问
app.get("/getAllQuestion", (req, res) => {
	fs.exists("allQuestions", (isExists) => {
		if(!isExists) {
			res.status(200).json({
				result: 0,
				msg: "没有提问信息!"
			});
		}
		else{
			//fs.readdir读取文件夹
			fs.readdir("allQuestions",(err,data)=>{
				if(err){
					// console.log('-----------')
					res.status(200).json({result:0,msg:"系统出错!"});
				}
				else{
					//用来保存所有提问
					var allMsg = [];
					var count = 0;
					//遍历allQuestions文件夹
					for(var index in data){
						//获取每一个文件
						var aMsg = data[index];
						//读取文件
                        // =========================非阻塞读取===================================
						// fs.readFile(`allQuestions/${aMsg}`,(err,fileData)=>{
						// 		if(err){
						// 				console.log('==========='+ aMsg);
						// 			res.status(200).json({result:0,msg:'系统出错!'});
						// 		}
						// 		else{
						// 			//把文件内容转化为js对象
						// 			var aMsgObj = JSON.parse(fileData);
						// 			//把每一条提问都放入数组
						// 			allMsg.push(aMsgObj);
						// 			count++;
						// 			if(count == data.length){
						// 				res.status(200).json({result:1,msg:"获取成功!",data:allMsg});
						// 			}
						// 		}
						// });
                        // =======================阻塞读取=======================================
                        var fileData = fs.readFileSync(`allQuestions/${aMsg}`);
            			//把文件内容转化为js对象
            			var aMsgObj = JSON.parse(fileData);
            			//把每一条提问都放入数组
            			allMsg.push(aMsgObj);
            			count++;
            			if(count == data.length){
            				res.status(200).json({result:1,msg:"获取成功!",data:allMsg});
            			}
					}
				}
			});
		}
	});
});

// 回复接口
app.post("/user/reply", function (req, res) {
    var content = req.body.content;
    var userName = req.body.userName;
    var time = req.body.time;
    console.log(req.body.time);
    fs.exists(`allQuestions/${time}`+".txt", function (exists) {
        if(!exists){
            console.log("not exist");
        }else {
            console.log("exist");
            fs.readFile(`allQuestions/${time}`+".txt", function (error, data) {
                if(error){

                }else {
                    data = JSON.parse(data);
                    var reply = data.reply;
                    var replyMsg = {
                        userName: userName,
                        content: content,
                        date: new Date(),
                        ip: req.ip
                    };
                    reply.push(replyMsg);
                    fs.writeFile(`allQuestions/${req.body.time}`+".txt", JSON.stringify(data), function (error) {
                        if(error){

                        }else {
                            res.status(200).json({result:1, msg:"回复成功"});
                        }
                    });
                }
            });
        }
    });
});

// TODO: 上传头像
app.post("/user/uploadAvatar", upload.single("avatar"), function (req, res) {
    console.log("upload");
    fs.readdir("static/avatar", function (error, data) {
        if (error) {
            res.status(200).json({result: 0, msg: "系统异常"});
        }else{
            var userName = req.cookies.userName;
            var fileName = `${userName}.jpg`;
            for (var index in data) {
                console.log(index);
                console.log(fileName + data[index]);
                if (fileName == data[index]) {
                    res.status(200).json({result:1, msg:"上传成功"});
                    break;
                }else if (index == (data.length-1)) {
                    res.status(200).json({result:1, msg:"上传失败"});
                }
            }
        }
    });
});

app.listen(3000,function () {
    console.log("linsten @3000 >>>>>>>>>>>>>>>>>>");
});
