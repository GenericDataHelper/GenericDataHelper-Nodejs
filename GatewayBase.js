const LOG_SUBJECT = require('path').basename(__filename);
const blacklist = require('./AutoBlock');

class GatewayBase {
    static sql = require('./Sql.js').instance();
    static log = require('./Logger').instance();
    static authFunction = null;

    time = require('./Time');

    constructor() { }

    static setAuthenticationFunction(authFunc) {
        this.authFunction = authFunc;
    }


    static authentication(conn, callback) {
        if (!this.authFunction)
            return;

        this.authFunction(conn, () => {
            blacklist.checkIsBlocked(conn.ip, {
                success: function() {
                    callback();
                },
                banned: function() {
                    conn.unauthorize();
                }
            });
        });
    }

    static query(query, connection, callback) {
        let safeQuery = query.replace(';', '');
        this.sql.query(safeQuery, (error, result, fields) => {
            if (error) {
                const content = `SQL 에러가 발생했습니다.\n${error.sqlMessage}\n\n쿼리: ${query}`;
                this.log.sqlError(LOG_SUBJECT, content);
                if (connection) {
                    connection.internalError();
                }
                return;
            }

            callback(result);
        });
    }
}

module.exports = GatewayBase;