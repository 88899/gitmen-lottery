-- 双色球数据表
CREATE TABLE IF NOT EXISTS ssq_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_no TEXT UNIQUE NOT NULL,
    draw_date TEXT NOT NULL,
    red1 TEXT NOT NULL,
    red2 TEXT NOT NULL,
    red3 TEXT NOT NULL,
    red4 TEXT NOT NULL,
    red5 TEXT NOT NULL,
    red6 TEXT NOT NULL,
    blue TEXT NOT NULL,
    sorted_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lottery_no ON ssq_lottery(lottery_no);
CREATE INDEX IF NOT EXISTS idx_draw_date ON ssq_lottery(draw_date);
CREATE INDEX IF NOT EXISTS idx_sorted_code ON ssq_lottery(sorted_code);

-- 大乐透数据表
CREATE TABLE IF NOT EXISTS dlt_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_no TEXT UNIQUE NOT NULL,
    draw_date TEXT NOT NULL,
    front1 TEXT NOT NULL,
    front2 TEXT NOT NULL,
    front3 TEXT NOT NULL,
    front4 TEXT NOT NULL,
    front5 TEXT NOT NULL,
    back1 TEXT NOT NULL,
    back2 TEXT NOT NULL,
    sorted_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dlt_lottery_no ON dlt_lottery(lottery_no);
CREATE INDEX IF NOT EXISTS idx_dlt_draw_date ON dlt_lottery(draw_date);
CREATE INDEX IF NOT EXISTS idx_dlt_sorted_code ON dlt_lottery(sorted_code);

-- 七星彩数据表
CREATE TABLE IF NOT EXISTS qxc_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_no TEXT UNIQUE NOT NULL,
    draw_date TEXT NOT NULL,
    num1 TEXT NOT NULL,
    num2 TEXT NOT NULL,
    num3 TEXT NOT NULL,
    num4 TEXT NOT NULL,
    num5 TEXT NOT NULL,
    num6 TEXT NOT NULL,
    num7 TEXT NOT NULL,
    sorted_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qxc_lottery_no ON qxc_lottery(lottery_no);
CREATE INDEX IF NOT EXISTS idx_qxc_draw_date ON qxc_lottery(draw_date);
CREATE INDEX IF NOT EXISTS idx_qxc_sorted_code ON qxc_lottery(sorted_code);

-- 七乐彩数据表
CREATE TABLE IF NOT EXISTS qlc_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_no TEXT UNIQUE NOT NULL,
    draw_date TEXT NOT NULL,
    basic1 TEXT NOT NULL,
    basic2 TEXT NOT NULL,
    basic3 TEXT NOT NULL,
    basic4 TEXT NOT NULL,
    basic5 TEXT NOT NULL,
    basic6 TEXT NOT NULL,
    basic7 TEXT NOT NULL,
    special TEXT NOT NULL,
    sorted_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qlc_lottery_no ON qlc_lottery(lottery_no);
CREATE INDEX IF NOT EXISTS idx_qlc_draw_date ON qlc_lottery(draw_date);
CREATE INDEX IF NOT EXISTS idx_qlc_sorted_code ON qlc_lottery(sorted_code);
