# GenericDataHelper-Nodejs
맨날 만드는 그것!! Data object와 관련된 REST API를 빠르게 작성할 수 있게 도와주는 Nodejs Server용 Module

# 설치 방법
당신의 git 최상위 폴더에서 다음 명령어를 실행합니다:

 git submodule add git@github.com:GenericDataHelper/GenericDataHelper-Nodejs.git
 
또는 아래와 같이 특정 디렉터리에 설치할 수 있습니다.

  git submodule add git@github.com:GenericDataHelper/GenericDataHelper-Nodejs.git inner_directory/GenericDataHelper


1. 서브모듈 루트 경로에서 npm install 을 합니다.
2. 프로젝트 루트 경로에 .env 파일을 생성하고 다음 필드를 작성합니다.
```
DB_HOST=
DB_USER=
DB_PW=
DB_NAME=
```
3. db 서버에서 init.sql 파일 안의 내용을 실행합니다.



### Logger에서는 warning 등급 이상의 로그가 남을 때 관리자에게 알릴 수 있습니다. 
```javascript 
Logger.setNotifier((title, content) => {
  console.log("run your notification code!");
});
```

### Gateway와 Connection은 네트워크 코드 작성을 도와주는 클래스입니다.

먼저 아래와 같이 범용 사용자 인증 코드를 작성할 수 있습니다.
```javascript 
GatewayBase.setAuthenticationFunction((conn, callback) => {
    let key = conn.key;
    if (key != YOUR_CORRECT_KEY) {
        conn.unauthorize();
    } else {
        callback();
    }
});
```

그리고 아래와 같이 GatewayBase를 상속하여 사용할 수도 있습니다.

```javascript 
const Logger = require("./GenericDataHelper/Logger").instance();
const Gateway = require("./GenericDataHelper/GatewayBase");
class MyGateway extends Gateway {
    constructor() { super() }

    myApi(conn) {
        Logger.verbose("MyGateway.myApi", `API 요청됨`, conn.ip);
        Gateway.authentication(conn, () => {
            console.log("launch your api code");
            conn.send("OK!");
        });
    }
}

module.exports = new MyGateway();
```
```javascript 
const app = require('express')();
const gateway = require('./MyGateway);
app.get('/endpoint', (req, res, next) => gateway.myApi(new Connection(req, res)));
```


DataGateway 클래스는 기본적인 SQL 명령어를 내장하고 있는 클래스입니다. 아래와 같이 사용할 수 있습니다.

```javascript 
const Gateway = require("./GenericDataHelper/DataGateway");
class MyDataGateway extends Gateway {
    constructor() { super("table_name") }
}

module.exports = new MyDataGateway();
```
```javascript 
const app = require('express')();
const gateway = require('./MyDataGateway);

app.get('/food/list', (req, res, next) => gateway.listWithConnection(new Connection(req, res)));
app.get('/food/random', (req, res, next) => gateway.randomWithConnection(new Connection(req, res)));
app.post('/food/add', (req, res, next) => gateway.addWithConnection(new Connection(req, res)));
app.post('/food/update', (req, res, next) => gateway.updateWithConnection(new Connection(req, res)));
app.post('/food/delete', (req, res, next) => gateway.deleteWithConnection(new Connection(req, res)));
```
