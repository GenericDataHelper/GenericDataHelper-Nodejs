const LOG_SUBJECT = require('path').basename(__filename);
const log = require("./Logger").instance();
const Gateway = require("./GatewayBase");
class DataGateway extends Gateway {
    tableName;  // 클래스에서 사용할 테이블 이름입니다.
    constructor(tableName) { 
        super();
        this.tableName = tableName;
    }

    list(param, conn, callback) {
        let ip = conn ? conn.ip : null;
        let orderQueryStr = this.#makeOrderbyParam(param.orderby);
        let whereParam = this.#makeWhereParam(param.where);
        let limitParam = param.limit ? `LIMIT ${param.limit}` : "";
        let offsetParam = param.offset ? `OFFSET ${param.offset}` : "";
        const query = `SELECT * FROM ${this.tableName} ${whereParam ? whereParam : ""} ${orderQueryStr} ${limitParam} ${offsetParam}`;
        Gateway.query(query, conn, (result) => {
            if (callback) callback(result);
        });
    }

    random(param, conn, callback) {
        let ip = conn ? conn.ip : null;
        let query = `SELECT * FROM ${this.tableName} ORDER BY RAND() LIMIT ${param.pickCount}`;
        Gateway.query(query, conn, (result) => {
            if (callback) callback(result);
        });
    }
    
    add(param, conn, callback) {
        let ip = conn ? conn.ip : null;
        let isnertParam = this.#makeInsertParam(param);
    
        if (!isnertParam) {
            log.error(LOG_SUBJECT, `ADD Parameter format error ${this.tableName}`, ip);
            if (conn) conn.internalError();
            return;
        }
        
        let query = `INSERT INTO ${this.tableName} (${isnertParam.columns}) VALUES (${isnertParam.values})`;
        log.verbose(LOG_SUBJECT, `ADD into ${this.tableName}\n${query}`, ip);

        Gateway.query(query, conn, (result) => {
            if (callback) callback(result);
        });
    }

    update(param, conn, callback) {
        let ip = conn ? conn.ip : null;
        let updateParam = this.#makeUpdateParam(param);

        if (!updateParam) {
            log.error(LOG_SUBJECT, `UPDATE Parameter format error ${this.tableName}`, ip);
            if (conn) conn.internalError();
            return;
        }
        
        let query = `UPDATE ${this.tableName} SET ${updateParam.set} WHERE ${updateParam.where}`;
        log.verbose(LOG_SUBJECT, `UPDATE from ${this.tableName}\n${query}`, ip);

        Gateway.query(query, conn, (result) => {
            if (callback) callback(result);
        })
    }

    delete(param, conn, callback) {
        let ip = conn ? conn.ip : null;
        let whereParam = this.#makeWhereParam(param);

        if (!whereParam) {
            log.error(LOG_SUBJECT, `DELETE Parameter format error ${this.tableName}`, ip);
            if (conn) conn.internalError();
            return;
        }
        
        let query = `DELETE FROM ${this.tableName} ${whereParam}`;
        log.verbose(LOG_SUBJECT, `DELETE from ${this.tableName}\n${query}`, ip);
        
        Gateway.query(query, conn, (result) => {
            if (callback) callback(result);
        })
    }
    
    /**
     * 대상 테이블의 row[]를 반환합니다.
     * 
     * @param {int} headers.page (optional) 페이지네이션 인덱스입니다. 지정하지 않으면 0으로 설정됩니다.
     * @param {int} headers.page_size (optional) 페이지네이션 크기입니다. 지정하지 않으면 10000으로 설정됩니다.
     * @param {string} headers.order_by (optional) 정렬 기준이 되는 컬럼을 설정합니다. 지정하지 않으면 정렬하지 않습니다.
     *                                               문자열의 작성은 #makeOrderQueryString을 참고합니다.
     */
    listWithConnection(conn) {
        let limit = conn.headers.page_size ? conn.headers.page_size : 20;
        let offset = conn.headers.page ? conn.headers.page * limit : 0;
        let orderby = conn.headers.order_by;

        Gateway.authentication(conn, () => {
            this.list({
                orderby : orderby, 
                limit : limit, 
                offset : offset
            }, conn, (result) => {
                conn.send(result);
            });
        });
    }
    

    /**
     * 대상 테이블에서 랜덤한 row[]를 반환합니다. 
     * 
     * @param {int} headers.pick_count (optional) 반환할 row의 갯수입니다. 지정하지 않으면 1로 설정됩니다.
     */
    randomWithConnection(conn) {
        let pickCount = conn.headers.pick_count ? conn.headers.pick_count : 1;

        Gateway.authentication(conn, () => {
            this.random({pickCount: pickCount}, conn, (result) => {
                conn.send(result);
            });
        });
    }


    /**
     * 대상 테이블에 새로운 row를 추가합니다.
     * 
     * @param {JsonObject} body 이 json 오브젝트의 key와 value를 각각 column과 value로 새로운 행을 삽입합니다.
     */
    addWithConnection(conn) {
        Gateway.authentication(conn, () => {
            this.add(conn.body, conn, (result) => {
                conn.send({insertId: result.insertId});
            });
        });
    }


    /**
     * 대상 테이블에 특정 row를 수정합니다.
     * 
     * @param {JsonObject} body.set 이 json 오브젝트의 key와 value를 각각 column과 value로 업데이트합니다.
     * @param {JsonObject} body.where 이 json 오브젝트의 key와 value를 각각 column과 value로 where절에 사용합니다.
     */
    updateWithConnection(conn) {
        Gateway.authentication(conn, () => {
            this.update(conn.body, conn, (result) => {
                conn.send(result);
            });
        });
    }

    /**
     * 대상 테이블에 특정 row를 삭제합니다.
     * 
     * @param {JsonObject} body 이 json 오브젝트의 key와 value를 각각 column과 value로 where절에 사용합니다.
     */
    deleteWithConnection(conn) {
        Gateway.authentication(conn, () => {
            this.delete(conn.body, conn, (result) => {
                conn.send(result);
            });
        });
    }

    
    /**
     * 전달받은 문자열로부터 order by 쿼리를 만듭니다.
     * 문자열은 다음과 같이 "컬럼명/정렬법" 으로 설정합니다... -> "idx/desc"
     * 사용할 수 있는 정렬법의 종류는 다음과 같습니다 : asc, desc, null, notnull
     * 
     * @param {string[]} orderByParameter 정렬법이 기재된 배열
     * 
     * 파라미터의 예시: "date/null, date/asc, time/null, time/asc, idx/desc"
     */
    #makeOrderbyParam(orderByParameter) {
        if (!orderByParameter)
            return "";

        let params = orderByParameter.split(",");
        if (params && params.length && params.length > 0) {
            let orderBy = [];
            for (var i = 0; i < params.length; i++) {
                let splited = params[i].split('/');
                if (splited.length!=2)
                    continue;
                
                let method = null;
                switch (splited[1].toLowerCase()) {
                    case "asc":
                        method = "asc";
                        break;
                    case "desc":
                        method = "desc";
                        break;
                    case "null":
                        method = "IS NULL";
                        break;
                    case "notnull":
                        method = "IS NOT NULL";
                        break;
                }

                if (method)
                    orderBy.push(`${splited[0]} ${method}`);
            }

            if (orderBy.length == 0)
                return "";
            else
                return `ORDER BY ${orderBy.join(',')}`;
        } else return "";
    }

    /**
     * 전달받은 json 오브젝트로부터 insert 쿼리를 만듭니다.
     * 오브젝트의 key값은 columns에, value값은 values에 매핑됩니다. 
     * 
     * @param {JsonObject} insertParameter 데이터 json 오브젝트
     * @returns 컬럼과 값 정보 배열을 각각 .column과 .values라는 이름으로 가진 오브젝트를 반환합니다. 오류가 발생하면 null을 반환합니다.
     */
    #makeInsertParam(insertParameter) {
        if (!insertParameter)
            return null;
            
        let keys = Object.keys(insertParameter);
        let values = Object.values(insertParameter);

        if (!keys || !values || keys.length==0 || values.length==0 || keys.length!=values.length)
            return null;
        
        let result = {};
        result.columns = keys.map(it => `\`${it}\``).join(',');
        result.values = values.map(it => `'${it}'`).join(',');

        return result;
    }

    /**
     * 전달받은 json 오브젝트로부터 update 쿼리를 만듭니다.
     * 
     * 파라미터 오브젝트는 아래와 같이 구성되어야합니다:
     *  {
     *    set : {column1:value1, column2:value2 ...},
     *    where : {column1:value1, column2:value2 ...}
     *  }
     * 
     * @param {JsonObject} updateParameter
     * @returns SET 쿼리와 WHERE 쿼리를 각각 .set와 .where라는 이름으로 가진 오브젝트를 반환합니다.
     *          오류가 발생하면 null을 반환합니다.
     */
    #makeUpdateParam(updateParameter) {
        if (!updateParameter)
            return null;

        let set = updateParameter.set;
        let where = updateParameter.where;

        if (!set || !where)
            return null;
    
        let result = {};

        // region set SET
        let set_keys = Object.keys(set);
        let set_values = Object.values(set);

        if (!set_keys || !set_values || set_keys.length==0 || set_values.length==0 || set_keys.length!=set_values.length)
            return null;

        let sets = [];
        for (var i= 0; i< set_keys.length; i++) {
            sets.push(`\`${set_keys[i]}\`='${set_values[i]}'`);
        }
        
        if (sets.length == 0)
            return;
        // endregion
        
        // region where WHERE
        let where_keys = Object.keys(where);
        let where_values = Object.values(where);

        if (!where_keys || !where_values || where_keys.length==0 || where_values.length==0 || where_keys.length!=where_values.length)
            return null;

        let wheres = [];
        for (var i= 0; i< where_keys.length; i++) {
            wheres.push(`\`${where_keys[i]}\`='${where_values[i]}'`);
        }

        if (wheres.length == 0)
            return;
        // endregion

        result.set = sets.join(',');
        result.where = wheres.join(" AND ");

        return result;
    }

    /**
     * 전달받은 json 오브젝트로부터 delete 쿼리를 만듭니다.
     * 
     * 파라미터 오브젝트는 아래와 같이 구성되어야합니다:
     *  { column1:value1, column2:value2 ... }
     * 
     * 이 때 value의 값 앞에 '<value' 또는 '>=value'처럼 관계 연산자를 함께 보낼 수 있습니다.
     * 
     * 
     * @param {JsonObject} deleteParameter
     * @returns DELETE문의 WHERE 절에 사용할 쿼리 문자열을 반환합니다.
     *          오류가 발생하면 null을 반환합니다.
     */
    #makeWhereParam(deleteParameter){
        if (!deleteParameter)
            return null;

        let keys = Object.keys(deleteParameter);
        let values = Object.values(deleteParameter);

        if (!keys || !values || keys.length==0 || values.length==0 || keys.length!=values.length)
            return null;

        let wheres = [];
        for (var i= 0; i< keys.length; i++) {
            let value = this.#parseOperator(values[i]);
            wheres.push(`\`${keys[i]}\`${value.operator}'${value.value}'`);
        }

        if (wheres.length == 0)
            return null;

        return `WHERE ${wheres.join(" AND ")}`;
    }

    #parseOperator(value) {
        if (!value) {
            return null;
        }

        value = value + "";
        
        if (value.startsWith("<")) {
            return {operator : '<', value : value.slice(1)};
        }
        if (value.startsWith("<=")) {
            return {operator : '<=', value : value.slice(2)};
        }
        if (value.startsWith(">")) {
            return {operator : '>', value : value.slice(1)};
        }
        if (value.startsWith(">=")) {
            return {operator : '>=', value : value.slice(2)};
        }
        if (value.startsWith("=")) {
            return {operator : '=', value : value.slice(1)};
        }

        return {operator : '=', value : value};
    }
}

module.exports = DataGateway;