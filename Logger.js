class Logger {
    #sql;
    #time;
    #notifier;

    constructor() {
        this.#sql = require('./Sql').instance();
        this.#time = require('./Time');
    }
    
    setNotifier(notifier) {
        this.#notifier = notifier;
    }
    
    /**
     * 
     * @param {int} id 로그 중요도
     * @param {string} subject 로그 분류
     * @param {string} content 로그 내용
     * @param {string} ip (Optional) 기록 아이피
     */
    #general_logging(level, subject, content, ip) {
        if (level >= 3) console.log(`[${subject}] ${content}`);
        if (!ip) ip = 'null'; else ip = `'${ip}'`;
        
        var query = `INSERT INTO \`log\` (created_at, \`level\`, subject, content, \`from\`) \
            VALUES ('${this.#time().format("YYYY-MM-DD HH:mm:ss")}','${level}','${subject}',${this.#sql.escape(content)},${ip})`;

        this.#sql.query(query, function(err, results, fields) {
            if(err) {
                console.log(err);
            }
        });
    }

    #notifyToAdmin(level, subject, text, ip) {
        if (!this.#notifier)
            return;

        var title = `서버에 문제가 발생했습니다.`;
        var content = `위치: ${subject}\n발생 날짜: ${this.#time().format("YYYY-MM-DD HH:mm:ss")}\n\n${text}\n\n기록된 아이피: ${ip}`;
        this.#notifier(title, content);
    }

    log             (level, subject, content, ip) { this.#general_logging(level, subject, content, ip); }
    verbose         (subject, content, ip) { this.#general_logging(0, subject, content, ip); }
    debug           (subject, content, ip) { this.#general_logging(1, subject, content, ip); }
    info            (subject, content, ip) { this.#general_logging(2, subject, content, ip); }
    warning         (subject, content, ip) { this.#general_logging(3, subject, content, ip); this.#notifyToAdmin(3, subject, content, ip) }
    error           (subject, content, ip) { this.#general_logging(4, subject, content, ip); this.#notifyToAdmin(4, subject, content, ip) }
    critical        (subject, content, ip) { this.#general_logging(5, subject, content, ip); this.#notifyToAdmin(5, subject, content, ip) }
    sqlError        (subject, error, ip)   { this.#general_logging(4, subject, error, ip); this.#notifyToAdmin(4, subject, error, ip) }
    
    destroy         ()                     { sql.destroy() }
}


module.exports = class Singleton {
    constructor() {
        throw "use instance()";
    }

    /**
     * notifier를 등록하면 warning 이상의 log가 발생할 때 해당 메서드를 호출합니다.
     * @param {function(string title, string content)} notifier title과 content에 해당하는 string을 인자로 호출합니다
     */
    static setNotifier(notifier) {
        Singleton.instance().setNotifier(notifier);
    }

    static instance() {
        if (!Singleton._instance) {
            Singleton._instance = new Logger();
        }
        return Singleton._instance;
    }
};