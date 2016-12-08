"use strict";
const fs = require('fs');
const sqlite3 = require('sqlite3');

class Database {
    constructor(dbFileName, newInstance) {
        let fileExists = false;
        try {
            fs.accessSync(dbFileName, fs.F_OK);
            fileExists = true;
        } catch (err) {}
        if (newInstance && fileExists) {
            fs.unlinkSync(dbFileName);
        }
        let db = new sqlite3.cached.Database(dbFileName);
        db.serialize();
        this.db = db;
        if (newInstance || !fileExists) {
            db.run(`CREATE TABLE \`proxies\` (
                     \`id\` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                     \`proxy\` text NOT NULL,
                     \`min_wait\` INTEGER NOT NULL DEFAULT \'0\',
                     \`max_wait\` INTEGER NOT NULL DEFAULT \'0\',
                     \`num_uses\` INTEGER NOT NULL DEFAULT \'0\',
                     \`created_at\` INTEGER NOT NULL DEFAULT \'0\',
                     \`updated_at\` INTEGER NOT NULL DEFAULT \'0\'
                  )`);
        }
    }

    addProxy(proxy, minWait, maxWait) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(1) as count FROM proxies WHERE proxy = '${proxy}';`, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row.count == 0) {
                    let timestamp = Date.now();
                    this.db.run(`INSERT INTO proxies (proxy, min_wait, max_wait, created_at, updated_at) VALUES ('${proxy}', ${minWait}, ${maxWait}, ${timestamp}, ${timestamp});`, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    nextProxy(callback) {
        this.db.get('SELECT * FROM proxies ORDER BY updated_at ASC, num_uses ASC LIMIT 1;', (err, row) => {
            if (err) {
                callback(err);
                return;
            }
            this.incrementProxy(row.id, () => {
                callback(null, row);
            });
        });
    }

    getProxies(callback) {
        this.db.all('SELECT * FROM proxies ORDER BY updated_at ASC, num_uses ASC;', (err, rows) => {
            if (err) {
                callback(err);
                return;
            }
            callback(null, rows);
        });
    }

    incrementProxy(id, callback) {
        let timestamp = Date.now();
        this.db.run(`UPDATE proxies SET updated_at = ${timestamp}, num_uses = num_uses + 1 WHERE id = ${id};`, (err) => {
            if (err) throw err;
            callback();
        });
    }
}

module.exports = Database;