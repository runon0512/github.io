// ====== 初期設定 ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// キャンバスサイズ
canvas.width = 1000;
canvas.height = 500; // キャンバスの高さを500

// === ズーム設定 ===
let ZOOM_LEVEL = 1.0; // スライダーで変更するため let に変更

// マシンサイズ (画像に合わせて調整)
const CAR_WIDTH = 100;
const CAR_HEIGHT = 40;

// 道幅
const TRACK_WIDTH = 500; // グリッド配置に合わせて道幅を調整 (100px増加)
const SHOULDER_WIDTH = 50;

// 壁のオフセット (コースの描画と当たり判定で使用)
const WALL_OFFSET = 0; // 透明な壁を撤去

// === 車の初期設定テンプレート ===
const carDefaults = {
    speed: 0,
    angle: -Math.PI/2, // 初期角度は0（右向き）
    maxSpeed: 16,
    maxSpeedReverse: 2,
    acceleration: 0.15,
    braking: 0.2,
    friction: 0.02,
    lateralFriction: 0.95,
    turnSpeed: 0.07, // 最大のステアリング感度を0.07に設定
    // AI固有のプロパティ (スタート遅延用)
    gameStartTime: 0,
    aiStartDelay: 0,
    aiHasStarted: false,
    driverName: "", // ドライバー名プロパティを追加
    // previousRank: 0 // 前フレームの順位を記録 (スタートグリッドからの変動に変更するため不要)
    startingGridRank: 0, // スタート時のグリッド順位を記録
    rating: 75, // AIレーティング (デフォルト値、AIカーはdriverLineupsから取得)
    hasFinished: false, // ゴールしたかどうか
    finishTime: 0,      // ゴールした時刻
    finalRank: 0,       // ゴール時の最終順位
    aggression: 0.5,    // AIの攻撃性 (0.0 - 1.0、0.5が標準)
    age: 25             // ドライバーの年齢 (デフォルト値)
};

// === プレイヤー選択情報 ===
let chosenPlayerInfo = {
    driverName: null,
    imageName: null,
    teamName: null, // Short name for player
    fullName: null, // Full name for player
    rating: null, // プレイヤーのレーティングも保持
    age: 18 // プレイヤーの初期年齢
};

// Add collision recovery rotation properties
carDefaults.isRotatingFromCollision = false;
carDefaults.collisionTargetAngle = null;
carDefaults.collisionRotationSpeed = 0.25; // 回転速度を増加 (例: 0.1 -> 0.25)

// 最高速度超過時に適用する追加の減速値
const OVER_MAX_SPEED_DECELERATION = 0.05; // 通常の摩擦(0.02)より大きく、ブレーキ(0.2)より小さい値

// 後方の車ほど最高速度を増加させる係数
// 例: 0.01 の場合、1台後ろの車ごとにベースの最高速度の1%ずつ増加する
// 最後尾の車 (インデックス NUM_CARS - 1) は、 (NUM_CARS - 1) * 0.01 だけ割合が増加する
// (初期グリッド位置に基づく)
const MAX_SPEED_INCREASE_FACTOR_PER_CAR = 0;

// 現在の順位に応じて最高速度を調整する係数 (1位との差1ランクごとにこの割合で増加)
const CATCH_UP_SPEED_FACTOR_PER_RANK = 0; // 例: 1%ずつ増加 (0.005から変更)

// === ブースト設定 ===
const BOOST_INTERVAL = 2000; // 5秒ごとにブースト判定 (ミリ秒)
const BOOST_DURATION = 2000; // ブースト持続時間5秒 (ミリ秒)
const BOOST_FACTOR = 1.1;    // 最高速度1.1倍


// === 車体画像のソース (提供されたファイル名を使用) ===
// ドライバーごとではなくチームごとの画像に変更
const carImageSources = [
    'RB_CAR.png',
    'MCL_CAR.png',
    'FER_CAR.png',
    'MER_CAR.png',
    'AM_CAR.png',
    'ALP_CAR.png',
    'WIL_CAR.png',
    'VC_CAR.png',
    'SAU_CAR.png',
    'HAA_CAR.png'
];

// === F1ドライバーラインナップ (2023年シーズン後半または2024年を想定) ===
// 各チームに対応する単一の画像ファイル名 image を追加し、images 配列を削除
let driverLineups = {
    "Red Bull":     { drivers: [{name: "M.VER", fullName: "Max Verstappen", rating: 99, aggression: 0.9, age: 26}, {name: "S.PER", fullName: "Sergio Perez", rating: 88, aggression: 0.6, age: 34}], image: "RB_CAR.png", tier: 1, accelerationFactor: 1.05, maxSpeedFactor: 1.01, turnSpeedFactor: 1.02 },
    "McLaren":      { drivers: [{name: "L.NOR", fullName: "Lando Norris", rating: 92, aggression: 0.7, age: 24}, {name: "O.PIA", fullName: "Oscar Piastri", rating: 89, aggression: 0.5, age: 23}], image: "MCL_CAR.png", tier: 1, accelerationFactor: 1.02, maxSpeedFactor: 1.02, turnSpeedFactor: 1.05 },
    "Ferrari":      { drivers: [{name: "C.LEC", fullName: "Charles Leclerc", rating: 91, aggression: 0.65, age: 26}, {name: "C.SAI", fullName: "Carlos Sainz", rating: 90, aggression: 0.7, age: 29}], image: "FER_CAR.png", tier: 2, accelerationFactor: 1.00, maxSpeedFactor: 1.01, turnSpeedFactor: 1.00 },
    "Mercedes":     { drivers: [{name: "L.HAM", fullName: "Lewis Hamilton", rating: 93, aggression: 0.75, age: 39}, {name: "G.RUS", fullName: "George Russell", rating: 89, aggression: 0.6, age: 26}], image: "MER_CAR.png", tier: 2, accelerationFactor: 1.01, maxSpeedFactor: 1.005, turnSpeedFactor: 1.01 },
    "Aston Martin": { drivers: [{name: "F.ALO", fullName: "Fernando Alonso", rating: 90, aggression: 0.85, age: 42}, {name: "L.STR", fullName: "Lance Stroll", rating: 78, aggression: 0.4, age: 25}], image: "AM_CAR.png", tier: 3, accelerationFactor: 0.98, maxSpeedFactor: 0.99, turnSpeedFactor: 0.98 },
    "Alpine":       { drivers: [{name: "E.OCO", fullName: "Esteban Ocon", rating: 85, aggression: 0.6, age: 27}, {name: "P.GAS", fullName: "Pierre Gasly", rating: 86, aggression: 0.55, age: 28}], image: "ALP_CAR.png", tier: 3, accelerationFactor: 0.97, maxSpeedFactor: 0.98, turnSpeedFactor: 0.99 },
    "Williams":     { drivers: [{name: "A.ALB", fullName: "Alexander Albon", rating: 87, aggression: 0.45, age: 28}, {name: "L.SAR", fullName: "Logan Sargeant", rating: 72, aggression: 0.75, age: 23}], image: "WIL_CAR.png", tier: 4, accelerationFactor: 0.87, maxSpeedFactor: 1.00, turnSpeedFactor: 0.95 },
    "VCARB":        { drivers: [{name: "Y.TSU", fullName: "Yuki Tsunoda", rating: 83, aggression: 0.7, age: 24}, {name: "L.LAW", fullName: "Liam Lawson", rating: 76, aggression: 0.95, age: 22}], image: "VC_CAR.png", tier: 4, accelerationFactor: 0.96, maxSpeedFactor: 0.975, turnSpeedFactor: 0.97 },
    "Kick Sauber":  { drivers: [{name: "V.BOT", fullName: "Valtteri Bottas", rating: 82, aggression: 0.4, age: 34}, {name: "G.ZHO", fullName: "Guanyu Zhou", rating: 79, aggression: 0.35, age: 25}], image: "SAU_CAR.png", tier: 5, accelerationFactor: 0.92, maxSpeedFactor: 0.95, turnSpeedFactor: 0.96 },
    "Haas":         { drivers: [{name: "K.MAG", fullName: "Kevin Magnussen", rating: 80, aggression: 0.8, age: 31}, {name: "N.HUL", fullName: "Nico Hulkenberg", rating: 81, aggression: 0.5, age: 36}], image: "HAA_CAR.png", tier: 5, accelerationFactor: 0.93, maxSpeedFactor: 0.95, turnSpeedFactor: 0.94 }
};

// === F2/リザーブドライバープール ===
// type: "F2", "Reserve"
// desiredTierMin/Max: F1昇格時の希望チームティア (1が最高)
// imageName: チーム画像を使用するため不要に
let reserveAndF2Drivers = [
    { name: "T.POU", fullName: "Theo Pourchaire", rating: 78, aggression: 0.6, age: 20, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "F.DRU", fullName: "Felipe Drugovich", rating: 77, aggression: 0.5, age: 23, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "O.BEA", fullName: "Oliver Bearman", rating: 79, aggression: 0.7, age: 19, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "J.DOO", fullName: "Jack Doohan", rating: 76, aggression: 0.65, age: 21, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "V.MAR", fullName: "Victor Martins", rating: 75, aggression: 0.55, age: 22, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "A.IWA", fullName: "Ayumu Iwasa", rating: 74, aggression: 0.8, age: 22, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "F.VES", fullName: "Frederik Vesti", rating: 77, aggression: 0.6, age: 22, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "D.HAU", fullName: "Dennis Hauger", rating: 73, aggression: 0.7, age: 21, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "Z.MAL", fullName: "Zane Maloney", rating: 72, aggression: 0.5, age: 20, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "E.FIT", fullName: "Enzo Fittipaldi", rating: 71, aggression: 0.75, age: 22, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "R.VCH", fullName: "Richard Verschoor", rating: 70, aggression: 0.4, age: 23, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "K.MAI", fullName: "Kush Maini", rating: 70, aggression: 0.6, age: 23, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "J.CRA", fullName: "Jak Crawford", rating: 69, aggression: 0.5, age: 19, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "I.HAD", fullName: "Isack Hadjar", rating: 72, aggression: 0.7, age: 19, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "G.BOR", fullName: "Gabriel Bortoleto", rating: 74, aggression: 0.65, age: 19, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "A.ANT", fullName: "Andrea Kimi Antonelli", rating: 80, aggression: 0.75, age: 17, desiredTierMin: 2, desiredTierMax: 4 }, // High potential
    { name: "P.ARO", fullName: "Paul Aron", rating: 68, aggression: 0.55, age: 20, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "F.COL", fullName: "Franco Colapinto", rating: 74, aggression: 0.8, age: 20, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "P.MAR", fullName: "Pepe Martí", rating: 66, aggression: 0.6, age: 18, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "T.BAR", fullName: "Taylor Barnard", rating: 65, aggression: 0.45, age: 19, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "A.NOB", fullName: "Aurelia Nobels", rating: 59, aggression: 0.65, age: 17, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "N.LAT", fullName: "Nicholas Latifi", rating: 70, aggression: 0.5, age: 28, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "N.MAZ", fullName: "Nikita Mazepin", rating: 68, aggression: 0.98, age: 25, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "M.SCH", fullName: "Mick Schumacher", rating: 77, aggression: 0.5, age: 25, desiredTierMin: 3, desiredTierMax: 5 },
    { name: "N.DEV", fullName: "Nyck de Vries", rating: 75, aggression: 0.6, age: 29, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "A.GIO", fullName: "Antonio Giovinazzi", rating: 76, aggression: 0.55, age: 30, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "R.SHW", fullName: "Robert Shwartzman", rating: 74, aggression: 0.6, age: 24, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "J.DAR", fullName: "Jehan Daruvala", rating: 72, aggression: 0.5, age: 25, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "M.ARM", fullName: "Marcus Armstrong", rating: 71, aggression: 0.65, age: 23, desiredTierMin: 4, desiredTierMax: 5 },
    { name: "C.NOV", fullName: "Clement Novalak", rating: 69, aggression: 0.7, age: 23, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "R.BOS", fullName: "Ralph Boschung", rating: 68, aggression: 0.4, age: 26, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "R.NIS", fullName: "Roy Nissany", rating: 65, aggression: 0.75, age: 29, desiredTierMin: 5, desiredTierMax: 5 },
    { name: "E.TRU", fullName: "Enzo Trulli", rating: 63, aggression: 0.6, age: 19, desiredTierMin: 5, desiredTierMax: 5 }
];


// carImageSources に含まれるべき正しいファイル名リスト (driverLineups と同期確認用)
const expectedImageFilesFromLineups = [];
for (const team in driverLineups) {
    const teamImage = driverLineups[team].image;
    if (teamImage && !expectedImageFilesFromLineups.includes(teamImage)) {
        expectedImageFilesFromLineups.push(teamImage);
    }
}
if (JSON.stringify(carImageSources.slice().sort()) !== JSON.stringify(expectedImageFilesFromLineups.slice().sort())) {
    console.warn("Warning: carImageSources array might not perfectly match all image filenames defined in driverLineups. Ensure all images in driverLineups are also listed in carImageSources if they are meant to be loaded.");
}


const NUM_UNIQUE_CARS = carImageSources.length; // ロード対象の画像総数

// === スターティンググリッド設定 ===
// NUM_REGULAR_CARS と NUM_MCLAREN_CARS の定義は、現在のドライバー割り当てロジックでは
// 直接使用されていないため、NUM_CARS を直接定義します。
const NUM_CARS = 20; // ゲームに参加する総ドライバー数 (driverLineups に基づく)

const GRID_ROWS = Math.ceil(NUM_CARS / 2); // 10行 (20台 / 2列)
const GRID_COLS = 2; // 2列
const ROW_SPACING = CAR_HEIGHT + 100; // 縦方向の間隔
const COL_SPACING = CAR_WIDTH + 80; // 横方向の間隔

// cars配列を初期化
let cars = [];
const trackCenterX = canvas.width / 2;

// 全ての画像がロードされたかを確認するためのカウンター
let loadedImagesCount = 0;
const imagesToLoad = carImageSources.length; // carImageSources 配列内の全画像

// === ゲーム進行フラグ ===
let allImagesLoaded = false;
let lastBoostActivationTime; // ブースト発動タイマー (ゲーム開始時に初期化)
// === ゲーム状態とシグナル ===
let gameState = 'loading'; // 'loading', 'title_screen', 'driver_selection', 'career_name_entry', 'career_team_selection', 'career_machine_performance', 'career_roster', 'signal_sequence', 'race', 'finished', 'all_finished', 'replay', 'career_season_end', 'career_team_standings', 'career_team_offers'
const SIGNAL_NUM_LIGHTS = 5;
const SIGNAL_LIGHT_ON_INTERVAL = 1000; // ms 各赤ランプの点灯から次のランプ点灯までの間隔
let SIGNAL_ALL_LIGHTS_ON_DURATION = 3000; // DEBUG: 全赤点灯時間を3秒に固定

let signalLightsOnCount = 0; // 点灯しているシグナルライトの数
let lastSignalChangeTimestamp = 0;
let raceActualStartTime = 0; // レースが実際に開始した時刻を記録
let zoomLevelBeforeSignal = ZOOM_LEVEL; // シグナルシーケンス開始前のズームレベルを保存 (初期化は gameState 移行時に行う)

// === シグナルシーケンス用カメラ設定 ===
let signalCameraPhase = 'idle'; // 'idle', 'show_full_grid', 'zoom_to_player', 'locked_on_player'
// let signalCameraCurrentTargetIndex = 0; // 以前のスクロール用、新しいロジックでは直接使用頻度は低い
let signalCameraScrollStartTime = 0;    // 現在のカメラフェーズが開始した時刻
let initialSignalZoom = 1.0; // グリッド全体表示時の計算されたズームレベル
const SIGNAL_CAMERA_GRID_VIEW_DURATION = 2000; // グリッド全体を静止して見る時間 (ms)
// SIGNAL_CAMERA_ZOOM_TO_PLAYER_DURATION はシグナル全体の残り時間から動的に計算


// === レースタイプとゴールライン設定 ===
const RACE_TYPES = {
    SPRINT: { name: "Sprint", distance: -50000, points: [15, 12, 10, 8, 6, 5, 4, 3, 2, 1] }, // 距離を調整
    MEDIUM: { name: "Medium", distance: -100000, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] },
    ENDURANCE: { name: "Endurance", distance: -200000, points: [35, 28, 23, 19, 16, 13, 10, 7, 4, 2] } // ポイントも変更
};
let currentRaceType = RACE_TYPES.SPRINT; // 初期値 (initializeRaceSettingsで設定)
let GOAL_LINE_Y_POSITION = RACE_TYPES.SPRINT.distance; // 初期値

function initializeRaceSettings(raceNumberInSeason) {
    const raceOrder = [RACE_TYPES.SPRINT, RACE_TYPES.MEDIUM, RACE_TYPES.ENDURANCE];
    currentRaceType = raceOrder[(raceNumberInSeason - 1) % raceOrder.length]; // 1レース目から順に
    GOAL_LINE_Y_POSITION = currentRaceType.distance;
}
const GOAL_LINE_THICKNESS = 20; // ゴールラインの描画時の太さ

// === 距離計算用定数・変数 (速度表示との整合性のため) ===
const SPEED_TO_KMH_FACTOR = 20; // playerCar.speed (px/frame) * 20 = km/h
const ASSUMED_FPS = 60;         // requestAnimationFrameのフレームレートを60FPSと仮定
const SECONDS_PER_HOUR = 3600;
let distanceToGoal = null;      // ゴールまでの残り距離 (km単位)
let carsFinishedCount = 0; // ゴールした車の数をカウント

// === リプレイ設定 ===
let raceHistory = []; // レース中の全車の状態を記録する配列
let replayFrameIndex = 0; // リプレイ再生中の現在のフレームインデックス
let selectedReplayCarIndex = 0; // リプレイで追尾する車のインデックス
let isReplayPaused = false; // リプレイ一時停止フラグ
let replaySpeedMultiplier = 1.0; // リプレイ再生速度 (例: 1.0で等速)
let lastReplayUpdateTime = 0; // リプレイ更新の最終時刻

let winnerFinishTime = 0; // 最初にゴールした車の時刻
// === UIボタンの定義 ===
const replayButton = {
    x: 0, y: 0, width: 150, height: 50, text: "Replay",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};
// === キャリアモード NEXTボタン ===
const careerNextButton = {
    x: 0, y: 0, width: 120, height: 40, text: "NEXT",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && gameState === 'all_finished' && careerPlayerTeamName && // 表示条件を追加
               mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

// === クイックレースボタン ===
const quickRaceButton = {
    x: 0, y: 0, width: 200, height: 50, text: "クイックレース",
    isVisible: false, // drawTitleScreen で true に設定
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

// === クイックレース用「戻る」ボタン ===
const quickRaceBackButton = {
    x: 0, y: 0, width: 120, height: 40, text: "Back",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && gameState === 'all_finished' && careerPlayerTeamName === null && // クイックレースの終了時のみ
               mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};
// === キャリアモード用ボタンの定義 ===
const careerModeButton = {
    x: 0, y: 0, width: 200, height: 50, text: "キャリアモード",
    isVisible: false, // drawDriverSelectionScreen で true に設定
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

// === セーブ/ロード関連 ===
const MAX_SAVE_SLOTS = 20;
const ALL_SAVES_KEY = 'formulaStraightAllSaves';
let saveSlotsMetadata = []; // セーブスロットのメタデータ（名前、タイムスタンプなど）を保持
let selectedSlotForAction = -1; // セーブ/ロード操作対象のスロットインデックス
let previousGameStateBeforeSaveLoad = null; // セーブ/ロード画面に入る前のgameStateを保持

const generalSaveButton = {
    x: 0, y: 0, width: 160, height: 40, text: "ゲームをセーブ",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

const loadGameButton = { // タイトル画面用
    x: 0, y: 0, width: 200, height: 50, text: "キャリアをロード",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

const backButton = { // セーブ・ロード画面用
    x: 10, y: 10, width: 100, height: 40, text: "戻る",
    isClicked: function(mouseX, mouseY) { // isVisible は各画面で制御
        return mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

const deleteAllSavesButton = { // ロード画面用
    x: 0, y: 0, width: 220, height: 40, text: "すべてのセーブデータを削除",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

// === セーブ/ロード画面レイアウト定数 ===
const SLOTS_PER_ROW = 5;
const SLOT_MARGIN_X = 20;
const SLOT_MARGIN_Y = 20;
const SLOT_START_Y_OFFSET = 120; // タイトルと戻るボタンの下
let calculatedSlotWidth = 0; // drawSaveLoadScreen で計算
let calculatedSlotHeight = 80; // 固定または動的に計算

// === キャリアモード マシンパフォーマンス画面 NEXTボタン ===
const careerMachinePerformanceNextButton = {
    x: 0, y: 0, width: 120, height: 40, text: "NEXT",
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && gameState === 'career_machine_performance' &&
               mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};

// === キャリアモード シーズン開始ボタン ===
const careerStartSeasonButton = {
    x: 0, y: 0, width: 220, height: 50, text: "NEXT", // テキストを "NEXT" に変更
    isVisible: false,
    isClicked: function(mouseX, mouseY) {
        return this.isVisible && gameState === 'career_roster' &&
               mouseX >= this.x && mouseX <= this.x + this.width && mouseY >= this.y && mouseY <= this.y + this.height;
    }
};
let careerPlayerName = { firstName: "", lastName: "" }; // キャリアモードのプレイヤー名 (姓と名)
let careerPlayerTeamName = null; // キャリアモードでプレイヤーが選択したチーム名
const careerModeAvailableTeams = ["Williams", "VCARB", "Haas"]; // キャリア初期に選択可能なチーム
// === キャリアモード シーズン設定 ===
const RACES_PER_SEASON = 3;
let currentSeasonNumber = 1;
let currentRaceInSeason = 1;
let careerDriverSeasonPoints = {}; // { "ドライバー名": ポイント, ... }
let careerTeamSeasonPoints = {}; // { "チーム名": ポイント, ... }
let previousRaceFinishingOrder = []; // 直前のレースの最終順位をドライバー名の配列で保存
// const racePointSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]; // RACE_TYPESに移動
let playerLastSeasonRank = 0; // プレイヤーの前シーズンの最終順位
let offeredTeams = []; // オファーされたチームのリスト
let careerSeasonEndScrollY = 0; // ポイント表示画面のスクロールYオフセット
let previousSeasonPointsForDisplay = {}; // マシンパフォーマンス画面表示用の前シーズンポイント
let careerMachinePerformanceScrollY = 0; // マシンパフォーマンス画面のスクロールYオフセット
let nextSeasonTiersForOfferDisplay = {}; // オファー表示用の来シーズンのTier情報を保持
let playerCareerHistory = []; // 各シーズンの成績などを記録する配列

// === タイトル画面用カメラ設定 ===
let titleScreenCameraOffsetY = 0;
const TITLE_SCREEN_SCROLL_SPEED = 0.5; // タイトル画面のコーススクロール速度

// === キャンバス内ズームスライダー設定 ===
const MIN_ZOOM = 0.5; // ズーム範囲の下限
const MAX_ZOOM = 1.0; // ズーム範囲の上限を1.0倍に変更
const SLIDER_TRACK_WIDTH = 15; // トラックの幅
const SLIDER_TRACK_HEIGHT = 150; // トラックの高さ
const SLIDER_THUMB_WIDTH = 25;  // つまみの幅
const SLIDER_THUMB_HEIGHT = 10; // つまみの高さ
const SLIDER_MARGIN_RIGHT = 30; // キャンバス右端からのマージン
let SLIDER_MARGIN_TOP = 20;   // 初期値。後に canvas.height を使って中央に配置

let sliderTrackX, sliderTrackY; // これらは draw 関数内で canvas サイズに基づいて計算
let isDraggingZoomSlider = false;

// 初期ZOOM_LEVELをスライダーのデフォルト値として設定
function calculateInitialZoomLevel() {
    // ZOOM_LEVEL は既に 1.0 で初期化されているので、ここでは特別な処理は不要
    // スライダーのYマージンをキャンバス中央になるように設定
    SLIDER_MARGIN_TOP = canvas.height / 2 - SLIDER_TRACK_HEIGHT / 2;
}
calculateInitialZoomLevel();

// === Scrollbar Settings ===
const SCROLLBAR_WIDTH = 12;
const SCROLLBAR_PADDING = 5; // スクロールバーとキャンバス右端との間のパディング
const SCROLLBAR_MIN_THUMB_HEIGHT = 20;
const SCROLLBAR_TRACK_COLOR = 'rgba(80, 80, 80, 0.7)';
const SCROLLBAR_THUMB_COLOR = 'rgba(130, 130, 130, 0.9)';
let isDraggingScrollbar = false;
let scrollbarDragStartMouseY = 0;
let scrollbarDragStartScrollY = 0;
let activeScrollbarScreen = null; // 'season_end', 'team_standings', 'machine_performance'
let scrollbarTrackHeightForDrag = 0;
let scrollbarThumbHeightForDrag = 0;
let scrollbarMaxScrollForDrag = 0;

// 初期ZOOM_LEVELをスライダーのデフォルト値として設定
function calculateInitialZoomLevel() {
    // ZOOM_LEVEL は既に 1.0 で初期化されているので、ここでは特別な処理は不要
    // スライダーのYマージンをキャンバス中央になるように設定
    SLIDER_MARGIN_TOP = canvas.height / 2 - SLIDER_TRACK_HEIGHT / 2;
}
calculateInitialZoomLevel();

// Moved from later in the file to ensure it's defined before use.
// This function loads metadata for save slots from localStorage.
function loadSaveSlotsMetadata() {
    const allSavesRaw = localStorage.getItem(ALL_SAVES_KEY);
    let allSaves = [];
    if (allSavesRaw) {
        try {
            allSaves = JSON.parse(allSavesRaw);
            if (!Array.isArray(allSaves)) allSaves = []; // 配列でなければリセット
        } catch (e) {
            console.error("Failed to parse save data from localStorage:", e);
            allSaves = [];
        }
    }

    saveSlotsMetadata = [];
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        if (allSaves[i] && typeof allSaves[i] === 'object' && allSaves[i] !== null) {
            saveSlotsMetadata.push({
                name: allSaves[i].saveName || `スロット ${i + 1}`,
                timestamp: allSaves[i].timestamp || 0,
                isEmpty: false,
                slotIndex: i
            });
        } else {
            saveSlotsMetadata.push({
                name: `空きスロット ${i + 1}`,
                timestamp: 0,
                isEmpty: true,
                slotIndex: i
            });
        }
    }
}

// 画像ロード完了後にゲームを開始するヘルパー関数
function checkAllImagesLoadedAndStartGame() {
    if (loadedImagesCount === imagesToLoad && !allImagesLoaded) { // 複数回呼び出されるのを防ぐ
        allImagesLoaded = true;
        initializeRaceSettings(currentRaceInSeason); // 初回レース設定
        loadSaveSlotsMetadata(); // セーブスロット情報をロード
        gameState = 'title_screen'; // タイトル画面から開始
        // initializeCars(); // ドライバー選択後に呼び出す
        // signalLightsOnCount = 0; // ドライバー選択後に設定
        // lastSignalChangeTimestamp = Date.now(); // ドライバー選択後に設定
        // SIGNAL_ALL_LIGHTS_ON_DURATION = Math.random() * 1000 + 500; // ドライバー選択後に設定
        gameLoop();
    }
}

// 画像を事前にロード
// const carImages = []; // この配列は直接使用されなくなります
const loadedCarImageObjects = {}; // ファイル名をキーとするImageオブジェクトのマップ

// carImageSources にリストされた全ての画像をロード
carImageSources.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        loadedImagesCount++;
        loadedCarImageObjects[src] = img; // ファイル名をキーとして保存
        checkAllImagesLoadedAndStartGame();
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        loadedImagesCount++;
        checkAllImagesLoadedAndStartGame(); // エラーでもカウンターは進め、他がロードされれば開始試行
    };
});

// グリッド配置の初期Y座標 (画面上部から少し離す)
const initialGridY = canvas.height * 0.15; // キャンバスが小さくなったので、割合を維持

// 配列をシャッフルするヘルパー関数 (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
// gridCarTypeOrderIndices は新しいロジックでは使用しません。

const numAiCars = NUM_CARS - 1; // 19台のAIカー
// cars配列は initializeCars 関数内で初期化される
// let cars = []; // グローバルスコープでの初期化は initializeCars に移動

// ヘルパー関数: プレイヤーの表示名をフォーマット
function formatPlayerDisplayName(firstName, lastName) {
    if (!firstName || !lastName || firstName.trim() === "" || lastName.trim() === "") {
        return "PLAYER"; // フォールバック
    }
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastThree = lastName.substring(0, Math.min(3, lastName.length)).toUpperCase();
    return `${firstInitial}.${lastThree}`;
}
function initializeCars() {
    cars = []; // 関数呼び出し時にクリアして再構築

    // --- プレイヤー情報 (選択された情報を使用) ---
    if (!chosenPlayerInfo || !chosenPlayerInfo.driverName) {
        console.warn("Player driver not selected, defaulting to Piastri for initialization.");
        // フォールバックとしてデフォルトのドライバーを設定
        // キャリアモードで名前が入力されていればそれを使う
        if (careerPlayerName && careerPlayerName.firstName && careerPlayerName.lastName) {
            chosenPlayerInfo = {
                driverName: formatPlayerDisplayName(careerPlayerName.firstName, careerPlayerName.lastName), // フォーマット済み短縮名
                fullName: careerPlayerName.firstName + " " + careerPlayerName.lastName, // フルネーム
                // imageName, teamName, rating はチーム/ドライバー選択時に設定される
                age: chosenPlayerInfo.age, // キャリア開始時の年齢
                imageName: chosenPlayerInfo.imageName || (careerPlayerTeamName ? driverLineups[careerPlayerTeamName].image : driverLineups["VCARB"].image), // キャリアならチームの画像、なければ仮
                teamName: careerPlayerTeamName || chosenPlayerInfo.teamName || "VCARB", // teamNameはそのまま
                rating: chosenPlayerInfo.rating || (careerPlayerTeamName ? driverLineups[careerPlayerTeamName].drivers[1].rating : driverLineups["VCARB"].drivers[0].rating) // キャリアならセカンドドライバーのレーティング、なければ仮
            };
        } else {
            // chosenPlayerInfo.age は既にデフォルト値(18) or キャリア開始時の値が設定されている
            // 通常のドライバー選択の場合、chosenPlayerInfo はクリック時に設定されるので、
            // ここでのフォールバックは、直接 'signal_sequence' などで始まった場合の極端なケース用
            // chosenPlayerInfo.driverName が null のままなら、後続の playerCarIndex の設定で問題が起きる可能性がある
            // そのため、何らかのデフォルトを設定しておく
            if (!chosenPlayerInfo.driverName) {
                console.warn("chosenPlayerInfo.driverName is null, setting a hard default for safety.");
                // このフォールバックは、キャリアモード以外のフローで問題が発生した場合の最終手段
            }
            // キャリアモードでない場合、chosenPlayerInfo は通常、ドライバー選択クリック時に設定される
            const defaultTeamData = driverLineups["McLaren"];
            const defaultDriverIndex = 1; // O.PIA
            chosenPlayerInfo = {
                driverName: defaultTeamData.drivers[defaultDriverIndex].name, // AIの短縮名
                fullName: defaultTeamData.drivers[defaultDriverIndex].fullName, // AIのフルネーム
                imageName: defaultTeamData.image, // チームの画像
                teamName: "McLaren",
                rating: defaultTeamData.drivers[defaultDriverIndex].rating,
                age: defaultTeamData.drivers[defaultDriverIndex].age // AIの年齢
            };
        }
    }
    const playerDriverInfo = chosenPlayerInfo;

    // currentDriverLineups は、このレースのために cars 配列を構築する際に使用する
    // driverLineups (グローバル) は、handleAiDriverTransfers によって更新された新シーズンの正しいロスターのはず
    // let currentDriverLineups = driverLineups; // グローバルな driverLineups を直接変更するため、このローカル変数は使用しない方針へ

    if (careerPlayerTeamName && playerDriverInfo.driverName) {
        // キャリアモードの場合、グローバルな driverLineups オブジェクトを直接更新してプレイヤー情報を反映させる。
        // これにより、レース後のポイント計算時に正しいチーム構成が参照される。
        // handleAiDriverTransfers はシーズン間の移籍を処理し、その際もグローバルな driverLineups を更新する。
        const teamForPlayer = driverLineups[careerPlayerTeamName]; // グローバルな driverLineups を直接参照・更新

        if (teamForPlayer) {
            const playerShortName = playerDriverInfo.driverName; // chosenPlayerInfo.driverName (フォーマット済み)
            let playerFoundInTeamRoster = false;

            for (let i = 0; i < teamForPlayer.drivers.length; i++) {
                if (teamForPlayer.drivers[i].name === playerShortName) {
                    // プレイヤーが既にチームのロスターにいる (handleAiDriverTransfersによる配置)
                    // chosenPlayerInfo の最新情報で更新
                    teamForPlayer.drivers[i] = {
                        name: playerShortName,
                        fullName: playerDriverInfo.fullName,
                        rating: playerDriverInfo.rating,
                        aggression: teamForPlayer.drivers[i].aggression !== undefined ? teamForPlayer.drivers[i].aggression : carDefaults.aggression,
                        age: playerDriverInfo.age
                    };
                    playerFoundInTeamRoster = true;
                    break;
                }
            }

            if (!playerFoundInTeamRoster) {
                // プレイヤーがチームのロスターにいなかった場合 (キャリア初期設定時など)
                // プレイヤーを配置する (通常はセカンドドライバーの位置)
                const newPlayerData = {
                    name: playerShortName,
                    fullName: playerDriverInfo.fullName,
                    rating: playerDriverInfo.rating,
                    aggression: (teamForPlayer.drivers.length > 1 && teamForPlayer.drivers[1] && teamForPlayer.drivers[1].aggression !== undefined) ? teamForPlayer.drivers[1].aggression : carDefaults.aggression,
                    age: playerDriverInfo.age
                };

                if (teamForPlayer.drivers.length >= 2) {
                    console.log(`Player ${playerShortName} not found in ${careerPlayerTeamName} roster, replacing driver at index 1.`);
                    const replacedDriver = teamForPlayer.drivers[1]; // 置き換えられるドライバーを取得
                    teamForPlayer.drivers[1] = newPlayerData;
                    // 置き換えられたドライバーをリザーブプールに追加
                    if (replacedDriver && replacedDriver.name !== playerShortName) {
                        const existingReserve = reserveAndF2Drivers.find(d => d.name === replacedDriver.name);
                        if (!existingReserve) {
                            const teamTier = teamForPlayer.tier || 5;
                            reserveAndF2Drivers.push({
                                name: replacedDriver.name, fullName: replacedDriver.fullName || replacedDriver.name,
                                rating: replacedDriver.rating, aggression: replacedDriver.aggression !== undefined ? replacedDriver.aggression : carDefaults.aggression,
                                age: replacedDriver.age, desiredTierMin: teamTier, desiredTierMax: Math.min(5, teamTier + 1)
                            });
                            console.log(`Replaced driver ${replacedDriver.name} from ${careerPlayerTeamName} (Tier ${teamTier}) added to reserve/F2 pool.`);
                            reserveAndF2Drivers.sort((a, b) => b.rating - a.rating); // レーティングでソート
                        }
                    }
                } else if (teamForPlayer.drivers.length === 1) {
                    console.log(`Player ${playerShortName} not found in ${careerPlayerTeamName} roster (1 driver team), replacing driver at index 0.`);
                    const replacedDriver = teamForPlayer.drivers[0]; // 置き換えられるドライバーを取得
                    teamForPlayer.drivers[0] = newPlayerData;
                    // 置き換えられたドライバーをリザーブプールに追加 (上記と同様のロジック)
                    if (replacedDriver && replacedDriver.name !== playerShortName) {
                        // (重複を避けるため、上記と全く同じコードブロックをここに挿入)
                    }
                } else {
                    console.log(`Player ${playerShortName} not found in ${careerPlayerTeamName} roster (0 driver team), adding player.`);
                    teamForPlayer.drivers.push(newPlayerData);
                }
            }
        } else {
            console.error(`Career mode: Player's team ${careerPlayerTeamName} not found in driverLineups for player placement.`);
        }
    }

    // --- 全ドライバーのプールを作成 (プレイヤーを含む) ---
    let allDriverPool = [];
    for (const teamName in driverLineups) { // 上記で更新された可能性のあるグローバルな driverLineups を使用
        const team = driverLineups[teamName];
        team.drivers.forEach((driverObj) => { // driverObj is {name, rating}
            // プレイヤーも含めて全ドライバーをプールに追加
            allDriverPool.push({
                driverName: driverObj.name,
                fullName: driverObj.fullName || driverObj.name, // playerTeam.drivers に fullName がない場合を考慮
                rating: driverObj.rating,
                aggression: driverObj.aggression !== undefined ? driverObj.aggression : carDefaults.aggression, // aggressionも追加
                age: driverObj.age, // 年齢も追加
                teamName: teamName
            });
        });
    }

    // --- 全ドライバーをティアごとにグループ分けし、各ティア内でシャッフル ---
    // オブジェクト名を driversByTier に変更 (AI限定ではないため)
    let driversByTier = { 1: [], 2: [], 3: [], 4: [], 5: [] }; // ティアの数に応じて調整
    let orderedDriversForGrid = [];

    // === キャリアモードの2レース目以降のグリッド順決定 ===
    if (careerPlayerTeamName && (currentRaceInSeason === 2 || currentRaceInSeason === 3) && previousRaceFinishingOrder.length === NUM_CARS) {
        console.log(`Career Mode - Race ${currentRaceInSeason}: Using reverse grid order from previous race.`);
        const driverPoolMap = new Map(allDriverPool.map(d => [d.driverName, d]));
        const reversedPreviousRaceOrder = [...previousRaceFinishingOrder].reverse();

        reversedPreviousRaceOrder.forEach(driverName => {
            if (driverPoolMap.has(driverName)) {
                orderedDriversForGrid.push(driverPoolMap.get(driverName));
                driverPoolMap.delete(driverName); // 処理済みとしてマップから削除
            } else {
                console.warn(`Driver ${driverName} from previous race order not found in current driver pool. This might happen if a driver was replaced mid-season (not currently supported).`);
            }
        });

        // previousRaceFinishingOrder に含まれていなかったが、現在のプールにいるドライバーがいれば最後尾に追加
        // (通常は発生しないはずだが、念のため)
        if (driverPoolMap.size > 0) {
            console.warn(`Some drivers in the current pool were not in the previous race order. Appending them to the grid:`);
            let remainingDrivers = [];
            driverPoolMap.forEach(driver => {
                console.warn(` - ${driver.driverName}`);
                remainingDrivers.push(driver);
            });
            // 残ったドライバーをレーティング順などでソートしても良い
            remainingDrivers.sort((a,b) => b.rating - a.rating);
            orderedDriversForGrid.push(...remainingDrivers);
        }

        if (orderedDriversForGrid.length !== NUM_CARS) {
            console.error(`Grid ordering mismatch after reverse grid logic. Expected ${NUM_CARS}, got ${orderedDriversForGrid.length}. Falling back to default tier-based sorting.`);
            // フォールバックのために orderedDriversForGrid をクリア
            orderedDriversForGrid = [];
        }
    }
    if (orderedDriversForGrid.length === 0) { // デフォルトのグリッド順 (ティアベース) またはフォールバック
    allDriverPool.forEach(driver => {
        const teamTier = driverLineups[driver.teamName].tier; // 更新されたグローバルな driverLineups を使用
        if (driversByTier[teamTier]) {
            driversByTier[teamTier].push(driver);
        } else {
            // 想定外のティアの場合 (エラーハンドリングまたはデフォルトティアへ)
            console.warn(`Driver ${driver.driverName} from team ${driver.teamName} has an undefined or unexpected tier: ${teamTier}. Assigning to a default tier or skipping.`);
            // 例えば、aiDriversByTier[5].push(aiDriver); のようにフォールバックも可能
        }
    });

    for (const tier in driversByTier) {
        shuffleArray(driversByTier[tier]);
    }

    // --- グリッドへの配置 ---
        const sortedTiers = Object.keys(driversByTier).sort((a, b) => parseInt(a) - parseInt(b)); // ティア1, 2, 3... の順
        for (const tier of sortedTiers) {
            driversByTier[tier].forEach(driverInfo => {
                if (orderedDriversForGrid.length < NUM_CARS) { // orderedDriversForGrid が NUM_CARS に達するまで追加
                    orderedDriversForGrid.push(driverInfo);
                }
            });
        }
    }

    // ヘルパー関数: 車をグリッドに配置 (isPlayer引数を削除し、内部で判定)
    const addCarToGrid = (driverInfo, gridPos) => { // gridPos は 0 から始まるインデックス
        const car = { ...carDefaults };
        car.driverName = driverInfo.driverName;
        car.fullName = driverInfo.fullName;
        car.image = loadedCarImageObjects[driverLineups[driverInfo.teamName].image]; // 更新されたグローバルな driverLineups から画像取得
        car.aggression = driverInfo.aggression !== undefined ? driverInfo.aggression : carDefaults.aggression;
        car.rating = driverInfo.rating !== undefined ? driverInfo.rating : carDefaults.rating;
        car.age = driverInfo.age !== undefined ? driverInfo.age : carDefaults.age;
        car.teamName = driverInfo.teamName;
        const isPlayer = driverInfo.driverName === playerDriverInfo.driverName;

        const teamData = driverLineups[driverInfo.teamName]; // 更新されたグローバルな driverLineups を使用
        const teamAccelerationFactor = teamData.accelerationFactor || 1.0;
        const teamMaxSpeedFactor = teamData.maxSpeedFactor || 1.0;
        const teamTurnSpeedFactor = teamData.turnSpeedFactor || 1.0;

        car.acceleration = carDefaults.acceleration * teamAccelerationFactor;
        car.turnSpeed = carDefaults.turnSpeed * teamTurnSpeedFactor;
        const teamAdjustedBaseMaxSpeed = carDefaults.maxSpeed * teamMaxSpeedFactor;

        if (isPlayer) {
            car.aiStartDelay = 0;
            car.aiHasStarted = true;
        } else {
            car.aiStartDelay = 0;
            car.aiHasStarted = false;
        }
        car.isBoosted = false;
        car.boostEndTime = 0;
        car.boostMultiplier = 1.0;

        const gridCol = gridPos % GRID_COLS;
        const gridRow = Math.floor(gridPos / GRID_COLS);

        if (gridCol === 0) {
            car.x = trackCenterX - (COL_SPACING / 2) - CAR_WIDTH;
            car.y = initialGridY + gridRow * ROW_SPACING - (ROW_SPACING * 0.5);
        } else {
            car.x = trackCenterX + (COL_SPACING / 2);
            car.y = initialGridY + gridRow * ROW_SPACING;
        }

        car.gridAdjustedMaxSpeed = teamAdjustedBaseMaxSpeed * (1 + gridPos * MAX_SPEED_INCREASE_FACTOR_PER_CAR);
        car.maxSpeed = car.gridAdjustedMaxSpeed;
        car.startingGridRank = gridPos + 1;

        cars.push(car);
    };

    // 決定された順序 (orderedDriversForGrid) に従って車をグリッドに配置
    orderedDriversForGrid.forEach((driverInfo, index) => {
        if (cars.length < NUM_CARS) { // cars配列がNUM_CARSに達するまで
            addCarToGrid(driverInfo, index); // index がそのまま gridPos になる
        }
    });

    // プレイヤーを最後尾に固定するロジックは削除

    // 最終確認
    if (cars.length !== NUM_CARS) {
        console.error(`Grid assignment error: Expected ${NUM_CARS} cars, but got ${cars.length}.`);
        // デバッグ情報: 各ティアのドライバー数
        // for (const tier of sortedTiers) { // sortedTiers はデフォルトロジックの場合のみ定義される
        //     console.log(`Tier ${tier} count: ${driversByTier[tier] ? driversByTier[tier].length : 'N/A'}`);
        // }
        console.log(`Player: ${playerDriverInfo.driverName}`);
    }

    // グローバルな playerCarIndex を設定
    playerCarIndex = cars.findIndex(car => car.driverName === playerDriverInfo.driverName);
    if (playerCarIndex === -1) {
        console.error("Player car could not be found in the 'cars' array after initialization. Defaulting to index 0.");
        playerCarIndex = 0; // フォールバック
    }
}

// 操作する車のインデックスを最後尾の車 (20番目) に設定
let playerCarIndex = NUM_CARS - 1; // const から let に変更し、initializeCarsで設定


let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    l: false, // lキーの状態
    autoTurnLeftActive: false // 自動左旋回フラグ
};

// カメラオフセット
let cameraOffsetX = 0;
let cameraOffsetY = 0;

// プレイヤーの現在の順位を保持する変数
let currentPlayerRank = 0;

// === カメラ設定 ===
const PLAYER_CAMERA_Y_POSITION_RATIO = 0.6; // プレイヤーの車を画面のどの高さの割合に表示するか (0.8から変更)

// ====== イベントリスナー ======
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase(); // WASDが大文字でも小文字として扱う
    if (keys.hasOwnProperty(key) ||
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {

        // gameState が 'replay' の場合、特定のキーでリプレイ操作
        if (gameState === 'replay') {
            if (e.key === ' ') { // スペースキーで再生/一時停止
                isReplayPaused = !isReplayPaused;
                if (!isReplayPaused) {
                    lastReplayUpdateTime = Date.now(); // 再生再開時に時刻を更新
                }
            }
            // リプレイ操作以外のキーはデフォルト動作を抑制しない
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === ' ' && gameState !== 'replay')) { // 下矢印、上矢印、スペースキーの場合 (リプレイ中以外)
            if (gameState !== 'replay') { // リプレイ中以外でこれらのキーが押されたらデフォルト動作を抑制
                e.preventDefault();
            }
        } else if (key === 'l') {
            keys.l = true;
            keys.autoTurnLeftActive = true; // lキーで自動旋回開始
            // console.log("Auto turn left activated");
        } else if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            // 他の移動キーが押されたら自動旋回を解除
            if (keys.autoTurnLeftActive) {
                // console.log("Auto turn left deactivated by other key.");
            }
            keys.autoTurnLeftActive = false;
        }
        // Arrow keys are stored directly, WASD are stored as lowercase
        if (keys.hasOwnProperty(key)) keys[key] = true;
        else if (keys.hasOwnProperty(e.key)) keys[e.key] = true; // Fallback for original e.key if needed
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
    else if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    // lキーが離されてもautoTurnLeftActiveは他のキーが押されるまで維持される
    // if (key === 'l') {
    //     keys.l = false; // lキー自体の押下状態はfalseにする
    // }
});

// === キャンバス上のスライダー操作のためのイベントリスナー ===
function getMousePos(canvasDom, event) {
    const rect = canvasDom.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (event) => {
    const mousePos = getMousePos(canvas, event);
    // スライダーのつまみの現在のY座標を計算
    const thumbY = sliderTrackY + ((ZOOM_LEVEL - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * (SLIDER_TRACK_HEIGHT - SLIDER_THUMB_HEIGHT);
    const sliderThumbX = sliderTrackX + (SLIDER_TRACK_WIDTH / 2) - (SLIDER_THUMB_WIDTH / 2);

    // つまみの上でマウスダウンされたかチェック
    if (mousePos.x >= sliderThumbX && mousePos.x <= sliderThumbX + SLIDER_THUMB_WIDTH &&
        mousePos.y >= thumbY && mousePos.y <= thumbY + SLIDER_THUMB_HEIGHT) {
        isDraggingZoomSlider = true;
        isDraggingScrollbar = false; // Ensure scrollbar dragging is off
    } else if (mousePos.x >= sliderTrackX && mousePos.x <= sliderTrackX + SLIDER_TRACK_WIDTH &&
               mousePos.y >= sliderTrackY && mousePos.y <= sliderTrackY + SLIDER_TRACK_HEIGHT) {
        // トラック上で直接クリックされた場合もドラッグ開始とし、値を更新
        isDraggingZoomSlider = true;
        isDraggingScrollbar = false; // Ensure scrollbar dragging is off
        updateZoomLevelFromMouse(mousePos.y);
    } else {
        // Check for scrollbar interaction if not dragging zoom slider
        let scrollbarParams = null;
        let currentScrollYVar = null;
        let setScrollYFunc = null;

        if (gameState === 'career_season_end' || gameState === 'career_team_standings') {
            scrollbarParams = getScrollbarRenderParams(
                gameState === 'career_season_end' ? (cars.length > 0 ? cars.length : NUM_CARS) * 25 : Object.keys(driverLineups).length * 25, // contentTotalHeight
                120, // scrollableAreaY
                canvas.height - 120 - 120, // scrollableAreaHeight
                careerSeasonEndScrollY
            );
            currentScrollYVar = careerSeasonEndScrollY;
            activeScrollbarScreen = gameState;
        } else if (gameState === 'career_machine_performance') {
            const teams = Object.keys(driverLineups);
            const numTeams = teams.length;
            const barHeight = 18; const barGap = 4; const teamGap = 12;
            const totalTeamBlockHeight = barHeight * 2 + barGap + teamGap;
            scrollbarParams = getScrollbarRenderParams(
                totalTeamBlockHeight * numTeams, // contentTotalHeight
                120, // scrollableAreaY (graphAreaY_local)
                canvas.height - 120 - 70, // scrollableAreaHeight
                careerMachinePerformanceScrollY
            );
            currentScrollYVar = careerMachinePerformanceScrollY;
            activeScrollbarScreen = gameState;
        }

        if (scrollbarParams && scrollbarParams.maxScroll > 0) {
            if (mousePos.x >= scrollbarParams.x && mousePos.x <= scrollbarParams.x + SCROLLBAR_WIDTH &&
                mousePos.y >= scrollbarParams.thumbY && mousePos.y <= scrollbarParams.thumbY + scrollbarParams.thumbHeight) {
                isDraggingScrollbar = true;
                isDraggingZoomSlider = false; // Ensure zoom slider dragging is off
                scrollbarDragStartMouseY = mousePos.y;
                scrollbarDragStartScrollY = currentScrollYVar;
                scrollbarTrackHeightForDrag = scrollbarParams.trackHeight;
                scrollbarThumbHeightForDrag = scrollbarParams.thumbHeight;
                scrollbarMaxScrollForDrag = scrollbarParams.maxScroll;
                event.preventDefault(); // Prevent text selection or other default actions
            }
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (isDraggingZoomSlider) {
        const mousePos = getMousePos(canvas, event);
        updateZoomLevelFromMouse(mousePos.y);
    } else if (isDraggingScrollbar) {
        const mousePos = getMousePos(canvas, event);
        const deltaMouseY = mousePos.y - scrollbarDragStartMouseY;
        let newScrollY = scrollbarDragStartScrollY;

        if (scrollbarTrackHeightForDrag - scrollbarThumbHeightForDrag > 0) {
            const scrollDeltaRatio = deltaMouseY / (scrollbarTrackHeightForDrag - scrollbarThumbHeightForDrag);
            newScrollY += scrollDeltaRatio * scrollbarMaxScrollForDrag;
        }

        newScrollY = Math.max(0, Math.min(newScrollY, scrollbarMaxScrollForDrag));

        if (activeScrollbarScreen === 'career_season_end' || activeScrollbarScreen === 'career_team_standings') {
            careerSeasonEndScrollY = newScrollY;
        } else if (activeScrollbarScreen === 'career_machine_performance') {
            careerMachinePerformanceScrollY = newScrollY;
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDraggingZoomSlider) {
        isDraggingZoomSlider = false;
    }
    if (isDraggingScrollbar) {
        isDraggingScrollbar = false;
        activeScrollbarScreen = null;
    }
});

canvas.addEventListener('mouseleave', () => {
    // isDraggingZoomSlider = false; // Keep dragging if mouse leaves and comes back while button is held
    // Similar for scrollbar, though less common. If mouseup is missed, this could be a fallback.
    // For now, rely on mouseup.
});

canvas.addEventListener('wheel', (event) => {
    if (gameState === 'career_season_end') {
        event.preventDefault();
        const scrollAmount = event.deltaY * 0.5;
        careerSeasonEndScrollY += scrollAmount;

        const listStartY = 120;
        const lineHeight = 25;
        const numDrivers = NUM_CARS; // ドライバーランキングのアイテム数
        const totalListContentHeight = numDrivers * lineHeight;
        const headerHeight = listStartY;
        const footerHeight = 120;
        const scrollableDisplayAreaHeight = canvas.height - headerHeight - footerHeight;
        let maxScrollY = Math.max(0, totalListContentHeight - scrollableDisplayAreaHeight);
        careerSeasonEndScrollY = Math.max(0, Math.min(careerSeasonEndScrollY, maxScrollY));

    } else if (gameState === 'career_team_standings') {
        event.preventDefault(); // デフォルトのページスクロールを防止
        const scrollAmount = event.deltaY * 0.5; // スクロール速度調整係数
        careerSeasonEndScrollY += scrollAmount;

        // スクロール範囲の制限
        const listStartY = 120; // drawCareerSeasonEndScreenでのリスト開始Y座標
        const lineHeight = 25;  // 各行の高さ
        // チームランキングのアイテム数 (driverLineupsのチーム数)
        const numTeams = Object.keys(driverLineups).length;
        const totalListContentHeight = numTeams * lineHeight; // Corrected: Actual height of the list items

        // スクロール可能な表示領域の高さ (ヘッダーとフッターボタンを除く)
        const headerHeight = listStartY;
        const footerHeight = 120; // Next Seasonボタンとその上のマージン程度
        const scrollableDisplayAreaHeight = canvas.height - headerHeight - footerHeight;

        let maxScrollY = 0;
        maxScrollY = Math.max(0, totalListContentHeight - scrollableDisplayAreaHeight);
        careerSeasonEndScrollY = Math.max(0, Math.min(careerSeasonEndScrollY, maxScrollY));
    } else if (gameState === 'career_machine_performance') {
        event.preventDefault();
        const scrollAmount = event.deltaY * 0.5;
        careerMachinePerformanceScrollY += scrollAmount;

        // These constants should match those in drawCareerMachinePerformanceScreen
        const graphAreaY_local = 120;
        const graphAreaHeight_local = canvas.height - graphAreaY_local - 70; // Bottom button margin (100 -> 70)

        const teams = Object.keys(driverLineups);
        const numTeams = teams.length;
        const barHeight = 18; const barGap = 4; const teamGap = 12;
        const totalTeamBlockHeight = barHeight * 2 + barGap + teamGap;
        const totalGraphContentHeight = totalTeamBlockHeight * numTeams; // Total height of the graph content

        let maxScrollY = 0;
        // maxScrollY is the total graph height minus the visible graph area height.
        // If all teams fit, maxScrollY will be 0 or negative, so Math.max(0, ...) handles it.
        maxScrollY = Math.max(0, totalGraphContentHeight - graphAreaHeight_local);

        careerMachinePerformanceScrollY = Math.max(0, Math.min(careerMachinePerformanceScrollY, maxScrollY));
    }
});

// グローバル変数として、セーブ処理中に一時的に使用するセーブデータを保持
let dataPreparedForSaving = null;

canvas.addEventListener('click', (event) => {
    const mousePos = getMousePos(canvas, event);

    // 汎用セーブボタンのクリック判定 (最優先)
    if (generalSaveButton.isClicked(mousePos.x, mousePos.y)) {
        // TODO: セーブ画面に入る前の gameState を保存しておき、セーブキャンセル時に戻れるようにする
        previousGameStateBeforeSaveLoad = gameState; // (例)

        if (gameState === 'all_finished' && careerPlayerTeamName) {
            // 'all_finished' からのセーブで、「次のレースから開始」するための特別処理
            const backup = {
                currentSeasonNumber: currentSeasonNumber,
                currentRaceInSeason: currentRaceInSeason,
                currentRaceType: JSON.parse(JSON.stringify(currentRaceType)),
                chosenPlayerInfo: JSON.parse(JSON.stringify(chosenPlayerInfo)),
                driverLineups: JSON.parse(JSON.stringify(driverLineups)),
                reserveAndF2Drivers: JSON.parse(JSON.stringify(reserveAndF2Drivers)),
                careerDriverSeasonPoints: JSON.parse(JSON.stringify(careerDriverSeasonPoints)),
                careerTeamSeasonPoints: JSON.parse(JSON.stringify(careerTeamSeasonPoints)),
                previousRaceFinishingOrder: JSON.parse(JSON.stringify(previousRaceFinishingOrder)),
            };

            let stateToSaveAs;
            if (currentRaceInSeason < RACES_PER_SEASON) { // シーズン中の次のレース
                currentRaceInSeason++;
                initializeRaceSettings(currentRaceInSeason); // GOAL_LINE_Y_POSITION と currentRaceType を更新
                stateToSaveAs = 'career_machine_performance';
            } else { // シーズン終了、次のシーズンの準備
                // ドライバー成長・加齢処理 (グローバル変数を変更)
                handleDriverDevelopmentAndAging();

                // AI移籍処理 (グローバル変数を変更)
                // careerTeamSeasonPoints は終了したシーズンのものを使用 (ティア更新のため)
                // careerPlayerTeamName は現シーズンのプレイヤーのチーム (移籍ロジックでのプレイヤー配置のため)
                driverLineups = handleAiDriverTransfers(
                    driverLineups, // 成長・加齢処理後のラインナップ
                    backup.careerTeamSeasonPoints, // 終了したシーズンのチームポイント
                    careerPlayerTeamName,          // 現シーズン(終了直後)のプレイヤーのチーム
                    chosenPlayerInfo.driverName,   // 成長・加齢処理後のプレイヤー名
                    reserveAndF2Drivers            // 成長・加齢処理後のリザーブ
                );

                currentSeasonNumber++;
                currentRaceInSeason = 1;
                careerDriverSeasonPoints = {}; // 新シーズンのためリセット
                careerTeamSeasonPoints = {};   // 新シーズンのためリセット
                previousRaceFinishingOrder = []; // 新シーズンのためリセット
                initializeRaceSettings(currentRaceInSeason); // 新シーズンの最初のレース設定
                stateToSaveAs = 'career_machine_performance';
            }

            dataPreparedForSaving = gatherSaveData(stateToSaveAs); // 更新されたグローバル変数と指定されたgameStateでセーブデータ作成

            // グローバル変数をバックアップから復元
            currentSeasonNumber = backup.currentSeasonNumber;
            currentRaceInSeason = backup.currentRaceInSeason;
            currentRaceType = backup.currentRaceType;
            chosenPlayerInfo = backup.chosenPlayerInfo;
            driverLineups = backup.driverLineups;
            reserveAndF2Drivers = backup.reserveAndF2Drivers;
            careerDriverSeasonPoints = backup.careerDriverSeasonPoints;
            careerTeamSeasonPoints = backup.careerTeamSeasonPoints;
            previousRaceFinishingOrder = backup.previousRaceFinishingOrder;
            initializeRaceSettings(currentRaceInSeason); // 実際の現在のレース状態に再設定
        } else {
            dataPreparedForSaving = gatherSaveData(gameState); // 通常のセーブ
        }
        gameState = 'save_game_selection';
        return; // 他のクリックイベントをここで止める
    }

    if (gameState === 'title_screen') {
        if (quickRaceButton.isClicked(mousePos.x, mousePos.y)) {
            GOAL_LINE_Y_POSITION = -100000; // クイックレースの距離を100000pxに設定
            currentRaceType = { name: "Quick Race", distance: GOAL_LINE_Y_POSITION, points: [] }; // クイックレース用の情報を設定
            gameState = 'driver_selection';
            quickRaceButton.isVisible = false;
            careerModeButton.isVisible = false;
            careerPlayerTeamName = null; // クイックレース選択時はキャリア情報をリセット
            console.log("Quick Race selected. Proceeding to driver selection.");
            return;
        }
        if (careerModeButton.isClicked(mousePos.x, mousePos.y)) {
            handleCareerModeButtonClick(); // この中でgameStateが変更される
            quickRaceButton.isVisible = false;
            careerModeButton.isVisible = false;
            console.log("Career Mode selected.");
            return;
        }
        if (loadGameButton.isClicked(mousePos.x, mousePos.y)) {
            gameState = 'load_game_selection';
            quickRaceButton.isVisible = false;
            careerModeButton.isVisible = false;
            loadGameButton.isVisible = false;
            return;
        }
        return; // タイトル画面でボタン以外をクリックした場合は何もしない
    }

    if (gameState === 'career_team_selection') {
        const titleHeight = 80;
        const itemHeight = 50;
        const itemPadding = 20;
        const buttonWidth = 300;
        const buttonHeight = 40; // クリック判定用の高さ (描画時の itemHeight と合わせる)
        const startY = 120; // drawCareerTeamSelectionScreen の描画開始Yと合わせる

        careerModeAvailableTeams.forEach((teamName, index) => {
            const buttonX = canvas.width / 2 - buttonWidth / 2;
            // 描画時のボタンY座標と合わせる
            const buttonY = startY + index * (itemHeight + itemPadding); // itemHeight はボタンの描画高さ

            if (mousePos.x >= buttonX && mousePos.x <= buttonX + buttonWidth &&
                mousePos.y >= buttonY && mousePos.y <= buttonY + itemHeight) { // クリック判定は itemHeight を使用

                careerPlayerTeamName = teamName;
                chosenPlayerInfo.teamName = teamName; // ドライバー選択画面でこのチームをデフォルト表示するため
                // chosenPlayerInfo.driverName はキャリアモードで既に設定されているので、ここではnullにしない
                chosenPlayerInfo.imageName = driverLineups[teamName].image; // チームの画像名を設定
                // chosenPlayerInfo.rating は、チームのセカンドドライバーのものを初期値とする
                // chosenPlayerInfo.fullName はキャリアモードで設定済みなので変更しない
                
                // --- 自動的にセカンドドライバーのスロットに割り当てる ---
                const teamData = driverLineups[careerPlayerTeamName];
                if (teamData && teamData.drivers.length > 1) {
                    // imageName は既にチーム画像で設定済み
                    chosenPlayerInfo.rating = teamData.drivers[1].rating; // セカンドドライバーのレーティング
                } else if (teamData && teamData.drivers.length === 1) { // ドライバーが1人のチームの場合
                    // imageName は既にチーム画像で設定済み
                    chosenPlayerInfo.rating = teamData.drivers[0].rating;
                } else {
                    // フォールバック (ありえないはずだが念のため)
                    console.error(`Team data for ${careerPlayerTeamName} not found or has no drivers.`);
                    gameState = 'driver_selection'; // エラー時はドライバー選択に戻す
                    return;
                }

                alert(`${careerPlayerTeamName} と契約し、自動的にスロットが割り当てられました。\nレースを開始します！`);
                // initializeCars(); // マシンパフォーマンス画面の後に移動
                gameState = 'career_machine_performance'; // マシンパフォーマンス画面へ
                console.log(`Career mode: Team ${careerPlayerTeamName} selected. Player assigned to team with image ${chosenPlayerInfo.imageName}. Starting race sequence.`);
                return;
            }
        });
        return; // チーム選択画面でのクリック処理はここまで
    }

    if (gameState === 'all_finished') {
        if (careerPlayerTeamName) { // キャリアモードの場合
            // 「NEXT」ボタンのクリック判定を優先
            if (careerNextButton.isClicked(mousePos.x, mousePos.y)) {
                gameState = 'career_season_end'; // ドライバーポイント表示画面へ
                careerNextButton.isVisible = false; // NEXTボタンを非表示
                replayButton.isVisible = false; // リプレイボタンも非表示にする
                careerSeasonEndScrollY = 0; // スクロールリセット
                console.log("NEXT button clicked, showing driver standings.");
                return;
            }
            // リプレイボタンのクリック判定 (NEXTボタンが押されなかった場合)
            // この後の共通リプレイボタン処理に任せるため、ここでは return しない
            if (replayButton.isVisible && replayButton.isClicked(mousePos.x, mousePos.y)) {
                // gameState = 'replay'; // 共通処理で対応
            }
        } else { // クイックレースの場合 (careerPlayerTeamName === null)
            // クイックレースの「Back」ボタンのクリック判定
            if (quickRaceBackButton.isClicked(mousePos.x, mousePos.y)) {
            alert("クイックレースが終了しました。ページをリロードしてもう一度プレイしてください。");
            // quickRaceBackButton.isVisible = false; // Keep visible or hide as per preference
            // replayButton.isVisible = false;      // Keep visible or hide as per preference
            console.log("Quick Race: Back button clicked, prompting user to reload.");
            return;
            }
        }
    } else if (gameState === 'career_season_end' && careerPlayerTeamName) {
        // ボタンのテキストと機能は drawCareerSeasonEndScreen で動的に設定される
        const actionButton = { // このボタンの定義は描画関数と合わせる
            x: canvas.width / 2 - 150,
            y: canvas.height - 100,
            width: 300,
            height: 50,
        };
        if (mousePos.x >= actionButton.x && mousePos.x <= actionButton.x + actionButton.width &&
            mousePos.y >= actionButton.y && mousePos.y <= actionButton.y + actionButton.height) {

            if (currentRaceInSeason < RACES_PER_SEASON) { // 「Next Race」ボタンが押された場合
                // このボタンは `career_season_end` (ドライバーランキング) 画面のボタン
                // チームランキング画面へ遷移する
                gameState = 'career_team_standings';
                careerSeasonEndScrollY = 0; // スクロールリセット
                console.log(`Proceeding to team standings view for Season ${currentSeasonNumber}, Race ${currentRaceInSeason}/${RACES_PER_SEASON}`);
            } else { // 「View Team Offers」ボタンが押された場合 (シーズン終了時のドライバーランキング画面)
                // このボタンも `career_season_end` (ドライバーランキング) 画面のボタン
                // チームランキング画面へ遷移する
                gameState = 'career_team_standings';
                careerSeasonEndScrollY = 0; // スクロールリセット
                console.log(`Season ${currentSeasonNumber} ended. Proceeding to final team standings view.`);
            }
            return;
        }
    } else if (gameState === 'career_team_standings' && careerPlayerTeamName) {
        const actionButton = { /* ... drawCareerTeamStandingsScreen と同じ定義 ... */
            x: canvas.width / 2 - 150, y: canvas.height - 100, width: 300, height: 50,
        };
        if (mousePos.x >= actionButton.x && mousePos.x <= actionButton.x + actionButton.width &&
            mousePos.y >= actionButton.y && mousePos.y <= actionButton.y + actionButton.height) {
            if (currentRaceInSeason < RACES_PER_SEASON) { // 「Next Race」ボタン (チームランキング画面)
                currentRaceInSeason++;
                careerSeasonEndScrollY = 0; // スクロールリセット
                // previousSeasonPointsForDisplay = JSON.parse(JSON.stringify(careerTeamSeasonPoints)); // マシンパフォーマンス表示用に現在のポイントを保持 <- 昨シーズンのポイントを維持するため削除
                initializeRaceSettings(currentRaceInSeason); // レースタイプ設定はここ
                gameState = 'career_machine_performance'; // マシンパフォーマンス画面へ
                // signal_sequence への遷移はロスタースクリーンのボタンで行う
                console.log(`Proceeding to next race setup: Season ${currentSeasonNumber}, Race ${currentRaceInSeason}/${RACES_PER_SEASON}`);
            } else { // 「View Team Offers」ボタン (シーズン終了時のチームランキング画面)
                // drawCareerSeasonEndScreen のシーズン終了時と同じロジックでリザルトデータを生成
                let tempAllDriversData = [];
                // driverLineups からAIドライバーの情報を収集
                for (const teamName in driverLineups) { // この時点のdriverLineupsは前シーズンのもの
                    const team = driverLineups[teamName];
                    team.drivers.forEach((driver) => {
                        // プレイヤーの情報は別途 chosenPlayerInfo から取得するため、
                        // ここでプレイヤー自身 (chosenPlayerInfo.driverName と一致するドライバー) はスキップする。
                        // プレイヤーがどのチームにいたとしても、chosenPlayerInfo.driverNameで識別する。
                        if (driver.name === chosenPlayerInfo.driverName) {
                            return; 
                        }
                        const points = careerDriverSeasonPoints[driver.name] || 0;
                        tempAllDriversData.push({
                            shortName: driver.name,
                            fullName: driver.fullName,
                            points: points,
                            isPlayer: false 
                        });
                    });
                }
                // プレイヤー自身の情報を chosenPlayerInfo から取得して追加
                const playerPoints = careerDriverSeasonPoints[chosenPlayerInfo.driverName] || 0;
                tempAllDriversData.push({
                    shortName: chosenPlayerInfo.driverName,
                    fullName: chosenPlayerInfo.fullName,
                    points: playerPoints,
                    isPlayer: true
                });

                // ポイントでソートしてプレイヤーの順位を決定
                tempAllDriversData.sort((a, b) => b.points - a.points);
                playerLastSeasonRank = tempAllDriversData.findIndex(d => d.isPlayer) + 1;
                if (playerLastSeasonRank === 0) { // プレイヤーが見つからない場合 (ありえないはずだが念のため)
                    console.error("Player not found in season end ranking for offer generation!");
                    playerLastSeasonRank = tempAllDriversData.length; // 最下位扱い
                }

                console.log(`Player finished season ${currentSeasonNumber} in rank: ${playerLastSeasonRank}`);

                // Calculate next season's tiers for offer generation
                // Use the *current* driverLineups (which reflects the team structure)
                // and the *finished* season's team points (careerTeamSeasonPoints)
                nextSeasonTiersForOfferDisplay = calculateNextSeasonTeamTiers(
                    driverLineups, // Current driverLineups (reflects team structure)
                    careerTeamSeasonPoints // Finished season's team points
                );

                console.log("Calculated next season team tiers for offer generation:", nextSeasonTiersForOfferDisplay);
                // オファールールに基づいてオファーチームを生成
                offeredTeams = generateTeamOffers(playerLastSeasonRank, careerPlayerTeamName ? driverLineups[careerPlayerTeamName].tier : 5, nextSeasonTiersForOfferDisplay);

                // === ドライバー成長・加齢処理 ===
                console.log("Before development/aging: Player Age:", chosenPlayerInfo.age, "Rating:", chosenPlayerInfo.rating);
                handleDriverDevelopmentAndAging(); // グローバル変数を直接更新
                console.log("After development/aging: Player Age:", chosenPlayerInfo.age, "Rating:", chosenPlayerInfo.rating);
                // === 成長・加齢処理ここまで ===
                gameState = 'career_team_offers'; // チームオファー画面へ
            }
            return;
        }
    }

    if (gameState === 'career_team_offers' && careerPlayerTeamName) { // careerPlayerTeamName は前シーズンのもの
        let offerWasClicked = false; // オファーがクリックされたかどうかのフラグ
        const buttonHeight = 50;
        const buttonPadding = 15;
        const buttonWidth = 350;
        const startY = 120;

        offeredTeams.forEach((teamName, index) => {
            if (offerWasClicked) return; // 既にオファーが処理されていれば、他のオファーの判定はスキップ

            const buttonX = canvas.width / 2 - buttonWidth / 2;
            const buttonY = startY + index * (buttonHeight + buttonPadding);

            if (mousePos.x >= buttonX && mousePos.x <= buttonX + buttonWidth &&
                mousePos.y >= buttonY && mousePos.y <= buttonY + buttonHeight) {

                // 前シーズンのチームポイントを保持 (マシンアップグレードとティア更新のため)
                const previousSeasonTeamPoints = JSON.parse(JSON.stringify(careerTeamSeasonPoints));
                previousSeasonPointsForDisplay = previousSeasonTeamPoints; // マシンパフォーマンス表示用に前シーズンのポイントを保持

                // 新しいシーズンへの準備
                currentSeasonNumber++;
                currentRaceInSeason = 1;
                careerDriverSeasonPoints = {}; // ポイントリセット
                careerTeamSeasonPoints = {};   // チームポイントもリセット
                previousRaceFinishingOrder = []; // 新シーズンのため前レース結果をリセット

                careerPlayerTeamName = teamName; // 新しいチームを設定
                chosenPlayerInfo.teamName = teamName;
                chosenPlayerInfo.imageName = driverLineups[teamName].image; // 新しいチームの画像名
                // chosenPlayerInfo.rating は新しいチームのセカンドドライバーのものを初期値とする
                // chosenPlayerInfo.age は handleDriverDevelopmentAndAging で更新済み
                // chosenPlayerInfo.driverName と fullName は維持

                // === AI移籍とマシンパフォーマンス更新をここで行う ===
                // driverLineups は handleDriverDevelopmentAndAging で更新済み
                // careerTeamSeasonPoints は前シーズンのものがまだ残っているはず
                // playerChosenTeamName は新しいチーム名 (teamName)
                // chosenPlayerInfo.driverName は更新済み
                // reserveAndF2Drivers は更新済み
                driverLineups = handleAiDriverTransfers(
                    driverLineups,
                    previousSeasonTeamPoints, // 保持しておいた前シーズンのポイントを使用
                    teamName,               // 新しいプレイヤーのチーム名
                    chosenPlayerInfo.driverName,
                    reserveAndF2Drivers
                );
                offerWasClicked = true; // フラグを立てる

                initializeRaceSettings(currentRaceInSeason);
                
                // チーム選択後、セカンドドライバーのレーティングをプレイヤーの初期レーティングとする
                const newTeamData = driverLineups[careerPlayerTeamName];
                if (newTeamData && newTeamData.drivers.length > 0) { // imageNameは設定済み
                    // プレイヤーのレーティングは handleDriverDevelopmentAndAging で更新された値を維持する
                    // chosenPlayerInfo.rating = (newTeamData.drivers[1] || newTeamData.drivers[0]).rating; 
                    // chosenPlayerInfo.age は既に更新されているので、ここではチームのドライバーの年齢を上書きしない
                }

                // 新しいシーズンへの準備 (移籍処理後)
                console.log(`INFO: You have signed with ${teamName} for Season ${currentSeasonNumber}!`);
                gameState = 'career_machine_performance'; // マシンパフォーマンス画面へ
                console.log(`Starting new season ${currentSeasonNumber} with team ${teamName}.`);

                playerLastSeasonRank = 0; // 新シーズンに向けてリセット
                offeredTeams = [];       // オファー情報をクリア
            }
        });

        if (offerWasClicked) {
            return; // オファーが処理された場合、メインのクリックハンドラから抜ける
        }

        // オファーがクリックされず、かつオファーリストが空の場合の処理 (変更なし)
        if (offeredTeams.length === 0 && !offerWasClicked) {
            // TODO: キャリア終了処理 or 強制的に下位チームへなど
            alert("No teams offered a contract. Career Over (WIP).");
            gameState = 'driver_selection'; // とりあえずドライバー選択に戻る
        }
    }

    // gameState === 'career_machine_performance' の場合のクリック処理 (NEXTボタン)
    if (gameState === 'career_machine_performance' && careerMachinePerformanceNextButton.isClicked(mousePos.x, mousePos.y)) {
        // isTransitioningToNewSeason は、オファー画面から来たかどうかで判定
        // currentRaceInSeason はオファー受諾時またはシーズン中の次のレース準備時に設定されている
        // currentSeasonNumber はオファー受諾時にインクリメントされている

        // マシンパフォーマンスの更新とAI移籍は、この画面に来る前 (オファー受諾時) に完了している。
        // よって、ここでの handleAiDriverTransfers の呼び出しは不要。

        if (currentRaceInSeason === 1) { // 新シーズンの最初のレース、またはキャリア最初のレース
            console.log("INFO: Machine Performance -> Roster (New Season Start or First Season Start)");
        } else {
            console.log("INFO: Machine Performance -> Roster (Mid-Season or First Season Start)");
        }

        initializeCars(); // AI移籍処理後、または移籍がない場合に車を初期化
        gameState = 'career_roster';
        careerMachinePerformanceNextButton.isVisible = false;
        return;
    }
    // gameState === 'career_roster' の場合のクリック処理 (シーズン開始ボタン)
    if (gameState === 'career_roster' && careerStartSeasonButton.isClicked(mousePos.x, mousePos.y)) {
        gameState = 'signal_sequence'; // シグナルシーケンスへ
        // レース開始のための各種リセット処理
        signalLightsOnCount = 0;
        lastSignalChangeTimestamp = Date.now();
        // SIGNAL_ALL_LIGHTS_ON_DURATION = Math.random() * 1000 + 500; // DEBUG: 固定値を使用するためコメントアウト
        raceActualStartTime = 0;
        raceHistory = [];
        replayFrameIndex = 0;
        carsFinishedCount = 0;
        winnerFinishTime = 0;
        lastBoostActivationTime = Date.now(); // ブーストタイマーもリセット

        replayButton.isVisible = false;
        careerNextButton.isVisible = false;
        careerStartSeasonButton.isVisible = false; // このボタンも非表示に

        generalSaveButton.isVisible = false; // レースシーケンスに入る前にセーブボタンを非表示にします
        console.log(`Starting race for Season ${currentSeasonNumber}, Race ${currentRaceInSeason}.`);

        // === シグナルシーケンス用カメラ初期化 ===
        zoomLevelBeforeSignal = ZOOM_LEVEL;
        ZOOM_LEVEL = zoomLevelBeforeSignal; // プレイヤー追尾開始時からレース前のズームレベルを適用

        // signalCameraPhase を 'locked_on_player' に直接設定し、スクロールとズームアニメーションをスキップ
        signalCameraPhase = 'locked_on_player';
        signalCameraScrollStartTime = Date.now();
        // initialSignalZoom や SIGNAL_CAMERA_GRID_VIEW_DURATION の計算と使用は不要になります。
        // === カメラ初期化ここまで ===
        return;
    }

    // === セーブ画面のクリック処理 ===
    if (gameState === 'save_game_selection') {
        if (backButton.isClicked(mousePos.x, mousePos.y)) {
            gameState = previousGameStateBeforeSaveLoad || 'title_screen';
            previousGameStateBeforeSaveLoad = null; // 使用後はクリア
            generalSaveButton.isVisible = false; // セーブボタンを非表示に戻す
            return;
        }
        // スロットクリック処理 (drawSaveLoadScreen と連携)
        const slotClickedIndex = getClickedSlotIndex(mousePos.x, mousePos.y);
        if (slotClickedIndex !== -1) {
            selectedSlotForAction = slotClickedIndex;
            const slotMeta = saveSlotsMetadata[selectedSlotForAction];
            let performSave = false;
            if (slotMeta.isEmpty) {
                performSave = true;
            } else {
                // 確認なしで上書き
                performSave = true;
                // もし確認を残す場合は以下のコメントを解除
                // if (confirm(`スロット ${selectedSlotForAction + 1} のデータ「${slotMeta.name}」を上書きしますか？`)) {
                //     performSave = true;
                // }
            }

            if (performSave) {
                if (!dataPreparedForSaving) {
                    // 通常ここには来ないはずだが、フォールバックとして現在の状態を保存
                    console.warn("dataPreparedForSaving was null, creating fallback save data.");
                    dataPreparedForSaving = gatherSaveData(previousGameStateBeforeSaveLoad || 'title_screen');
                }
                saveGameToSlot(selectedSlotForAction, dataPreparedForSaving);
                dataPreparedForSaving = null; // 使用後はクリア
                loadSaveSlotsMetadata(); // メタデータを更新
                // gameState = 'career_machine_performance'; // セーブ後は元の画面に戻る
                gameState = previousGameStateBeforeSaveLoad || 'title_screen';
                previousGameStateBeforeSaveLoad = null; // クリア
            }
        }
        return; // セーブ画面のクリック処理はここまで
    }

    // === ロード画面のクリック処理 ===
    if (gameState === 'load_game_selection') {
        if (backButton.isClicked(mousePos.x, mousePos.y)) {
            gameState = 'title_screen';
            previousGameStateBeforeSaveLoad = null; // 使用後はクリア
            // generalSaveButton.isVisible = false; // タイトル画面では通常表示されない
            return;
        }
        if (deleteAllSavesButton.isClicked(mousePos.x, mousePos.y)) {
            if (confirm("本当にすべてのセーブデータを削除しますか？この操作は元に戻せません。")) {
                if (confirm("最終確認：すべてのセーブデータを完全に削除します。よろしいですか？")) {
                    localStorage.removeItem(ALL_SAVES_KEY);
                    loadSaveSlotsMetadata(); // メタデータを再読み込みして画面を更新
                    alert("すべてのセーブデータが削除されました。");
                } else {
                    alert("削除はキャンセルされました。");
                }
            } else {
                alert("削除はキャンセルされました。");
            }
            return;
        }
        const slotClickedIndex = getClickedSlotIndex(mousePos.x, mousePos.y);
        if (slotClickedIndex !== -1 && !saveSlotsMetadata[slotClickedIndex].isEmpty) {
            selectedSlotForAction = slotClickedIndex;
            const loadResult = loadGameFromSlot(selectedSlotForAction);

            if (loadResult.success) {
                // All data is loaded. initializeCars (if needed) has been called
                // within applyLoadedData based on the *saved* state (loadResult.loadedGameState).
                // Now, explicitly transition to the machine performance screen.
                gameState = 'career_machine_performance';
            } else {
                // Load failed, go to title screen as a fallback.
                gameState = 'title_screen';
            }
        }
        return;
    }
    if (gameState === 'driver_selection') {
        // --- ドライバー選択画面のクリック判定 (新しい3列レイアウトに合わせて修正) ---

        // 以下は既存のドライバー選択ロジック
        // (キャリアモードボタンがクリックされなかった場合に実行される)

        // キャリアモードでチームが選択されていればそのチームのみ、そうでなければ全チーム
        const teams = careerPlayerTeamName ? [careerPlayerTeamName] : Object.keys(driverLineups);
        const numTeams = teams.length;
        const numColumns = careerPlayerTeamName ? 1 : 4; // キャリアモードでチーム選択済みの場合は1列
        const columnWidth = careerPlayerTeamName ? canvas.width : canvas.width / numColumns; // 1列の場合は全幅
        const horizontalPadding = 20; // 各列内の左右のパディング
        // const driverClickableWidth = columnWidth - horizontalPadding * 2 - 10; // 列幅から計算する場合
        const driverClickableWidth = 200; // 固定のクリック幅 (以前の250から調整)

        let currentIterationTeamIndex = 0; // 全チームを走査するためのインデックス
        let startYForRow = 100; // 描画時の最初の行の開始Y座標 (少し上に調整)

        const itemHeight = 30;  // 描画時の行の高さに合わせる
        const driverTextSize = 20;  // 描画時のフォントサイズ目安
        const teamNameHeight = itemHeight; // チーム名表示行の高さ
        // const machineImageHeight = itemHeight * 1.5; // マシン画像削除のため不要
        // const spaceAfterMachineImage = 10; // マシン画像削除のため不要

        const driverNameIndent = 10; // チーム名からのドライバー名のインデント
        const teamBlockPaddingY = 40; // チームブロックの行間の縦のスペース

        while (currentIterationTeamIndex < numTeams) {
            let maxDriversInThisRow = 0;
            let teamsInCurrentRowData = [];

            // 現在の行に表示されるチームの情報を収集
            for (let col = 0; col < numColumns && (currentIterationTeamIndex + col) < numTeams; col++) { // numTeams を使用
                const teamName = teams[currentIterationTeamIndex + col];
                const teamInfo = driverLineups[teamName];
                teamsInCurrentRowData.push({
                    name: teamName,
                    drivers: teamInfo.drivers,
                    images: teamInfo.images,
                    columnIndexInRow: col
                });
                maxDriversInThisRow = Math.max(maxDriversInThisRow, teamInfo.drivers.length);
            }

            // この行の各チームのドライバーをチェック
            for (const teamData of teamsInCurrentRowData) {
                let teamDisplayX = teamData.columnIndexInRow * columnWidth + horizontalPadding;
                if (careerPlayerTeamName) { // キャリアモードでチーム選択済みの場合、中央に表示
                    // クリック判定のX座標も描画に合わせて調整
                    teamDisplayX = canvas.width / 2 - driverClickableWidth / 2; // 描画要素の幅を考慮して中央寄せ
                }
                // ドライバーリストの開始Y座標は、チーム名の表示後 (マシン画像削除)
                let driverDisplayY = startYForRow + teamNameHeight;

                for (let i = 0; i < teamData.drivers.length; i++) {
                    const driverObj = teamData.drivers[i]; // Get the driver object
                    const driverName = driverObj.name;    // Extract name
                    const driverRating = driverObj.rating;  // Extract rating
                    const driverAge = driverObj.age; // Extract age
                    // const driverImageName = teamData.images[i]; // 不要
                    const driverTextStartX = teamDisplayX + driverNameIndent;

                    const clickTop = driverDisplayY - driverTextSize;
                    const clickBottom = driverDisplayY + 5; // ベースラインより少し下
                    if (mousePos.x >= driverTextStartX && mousePos.x <= driverTextStartX + driverClickableWidth &&
                        mousePos.y >= clickTop && mousePos.y <= clickBottom) {

                        if (careerPlayerTeamName) { // キャリアモードでチーム選択済みの場合
                            // プレイヤー名は既にフォーマット済みで chosenPlayerInfo.driverName に設定されている
                            // chosenPlayerInfo.imageName は既にチーム画像名が設定されている
                            chosenPlayerInfo.teamName = teamData.name; // これは careerPlayerTeamName と同じはず
                            chosenPlayerInfo.rating = driverRating;
                            // chosenPlayerInfo.age はキャリア開始時またはシーズン終了時に設定/更新される
                        } else { // 通常のドライバー選択
                            chosenPlayerInfo = {
                                driverName: driverName, // AIドライバーの整形済み名
                                fullName: driverLineups[teamData.name].drivers.find(d => d.name === driverName)?.fullName || driverName, // AIのフルネーム
                                // imageName: driverImageName, // 不要。チームの画像名を設定
                                imageName: driverLineups[teamData.name].image,
                                teamName: teamData.name,
                                rating: driverRating,
                                age: driverAge // AIドライバーの年齢も設定
                            };
                        }
                        // キャリアモードの場合、careerPlayerTeamName は既に設定されているはず
                        if (careerPlayerTeamName && careerPlayerTeamName !== teamData.name) {
                            console.warn("Mismatch: careerPlayerTeamName and selected driver's teamName differ.");
                        }
                        initializeCars();
                        gameState = 'signal_sequence';
                        signalLightsOnCount = 0;
                        lastSignalChangeTimestamp = Date.now();
                        // SIGNAL_ALL_LIGHTS_ON_DURATION = Math.random() * 1000 + 500; // DEBUG: 固定値を使用するためコメントアウト
                        raceActualStartTime = 0; raceHistory = []; replayFrameIndex = 0;
                        carsFinishedCount = 0; winnerFinishTime = 0;

                        // === シグナルシーケンス用カメラ初期化 ===
                        zoomLevelBeforeSignal = ZOOM_LEVEL; // シグナルシーケンス開始前のズームレベルを保存
                        signalCameraPhase = 'locked_on_player'; // ズームアニメーションをスキップし、プレイヤーにロックオン
                        signalCameraScrollStartTime = Date.now();
                        // === カメラ初期化ここまで ===
                        return;
                    }
                    driverDisplayY += itemHeight; // 次のドライバー（同じチーム内、縦方向）
                }
            }
            // 次の行の開始Y座標を計算
            // マシン画像の高さを除外
            startYForRow += teamNameHeight + (maxDriversInThisRow * itemHeight) + teamBlockPaddingY;
            currentIterationTeamIndex += teamsInCurrentRowData.length; // 処理したチーム数を進める
        }
        return; // ドライバー選択画面で、ドライバー以外をクリックした場合は何もしない
    }

    // Handle Replay Button click first, if visible
    // This button is visible in 'all_finished' state, or
    // in 'replay' state when a replay has just ended (and not in career mode).
    if (replayButton.isVisible && replayButton.isClicked(mousePos.x, mousePos.y)) {
        gameState = 'replay'; // Transition to or confirm replay state
        replayFrameIndex = 0; // リプレイは最初から再生
        selectedReplayCarIndex = playerCarIndex; // デフォルトはプレイヤー追尾
        isReplayPaused = false;
        replaySpeedMultiplier = 1.0;
        lastReplayUpdateTime = Date.now();
        replayButton.isVisible = false; // Hide after clicking to start/restart replay
        console.log("Replay (re)started via Button");
        return; // Click handled
    }

    // If not a replay button click, then handle other clicks based on gameState
    if (gameState === 'replay') {
        // リプレイUIのドライバー選択リストのクリック判定
        const replayUiDriverListYStart = 50;
        const replayUiDriverListLineHeight = 20;
        const replayUiDriverListXStart = 10;
        const replayUiDriverListWidth = 200; // クリック判定の幅
        // 描画時と同じように、現在のリプレイフレームの状態でソートされたリストを作成
        const sortedCarsForClickHandling = cars
            .map((car, index) => ({
                ...car, // carオブジェクトの全プロパティをコピー
                originalIndex: index // 元のインデックスを保持
            }))
            .sort((a, b) => a.y - b.y); // Y座標で昇順ソート

        sortedCarsForClickHandling.forEach((carData, sortedIndex) => {
            const driverNameY = replayUiDriverListYStart + sortedIndex * replayUiDriverListLineHeight;
            if (mousePos.x >= replayUiDriverListXStart && mousePos.x <= replayUiDriverListXStart + replayUiDriverListWidth &&
                mousePos.y >= driverNameY - replayUiDriverListLineHeight / 2 && mousePos.y <= driverNameY + replayUiDriverListLineHeight / 2) {
                selectedReplayCarIndex = carData.originalIndex; // ソート前の元のインデックスを設定
                // lastReplayUpdateTime = Date.now(); // 追尾対象変更時にリプレイ時間をリセットしたくない場合は不要
            }
        });
        // ここに他のリプレイ中のUI要素（再生/一時停止ボタンなど）のクリック判定を追加できる
    } else if (gameState !== 'all_finished') { // 'all_finished' 以外の状態で、まだリプレイボタンが押されていない場合
        // No specific actions needed here for now, but this structure allows future expansion.
    }
});

// セーブ/ロード画面でクリックされたスロットのインデックスを取得するヘルパー
function getClickedSlotIndex(mouseX, mouseY) {
    if (calculatedSlotWidth <= 0) return -1; // スロット幅が未計算なら何もしない

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        const col = i % SLOTS_PER_ROW;
        const row = Math.floor(i / SLOTS_PER_ROW);

        const slotX = SLOT_MARGIN_X + col * (calculatedSlotWidth + SLOT_MARGIN_X);
        const slotY = SLOT_START_Y_OFFSET + row * (calculatedSlotHeight + SLOT_MARGIN_Y);

        if (mouseX >= slotX && mouseX <= slotX + calculatedSlotWidth &&
            mouseY >= slotY && mouseY <= slotY + calculatedSlotHeight) {
            return i;
        }
    }
    return -1;
}

// マウス位置をグローバルに追跡 (スロットのハイライト用)
let currentMouseX = 0;
let currentMouseY = 0;
canvas.addEventListener('mousemove', (event) => {
    const mousePos = getMousePos(canvas, event);
    currentMouseX = mousePos.x;
    currentMouseY = mousePos.y;

    if (isDraggingZoomSlider) { // 既存のロジック
        updateZoomLevelFromMouse(mousePos.y);
    }
});
function updateZoomLevelFromMouse(mouseY) {
    let newZoom = MIN_ZOOM + ((mouseY - sliderTrackY) / SLIDER_TRACK_HEIGHT) * (MAX_ZOOM - MIN_ZOOM);
    ZOOM_LEVEL = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
}
// ====== 回転を考慮したAABB（軸並行境界ボックス）を取得するヘルパー関数 ======
function getRotatedAABB(car) {
    const centerX = car.x + CAR_WIDTH / 2;
    const centerY = car.y + CAR_HEIGHT / 2;
    const halfW = CAR_WIDTH / 2;
    const halfH = CAR_HEIGHT / 2;
    const angle = car.angle;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // 車の中心を原点としたときの四隅のローカル座標
    const localCorners = [
        { x: -halfW, y: -halfH }, // 左上
        { x:  halfW, y: -halfH }, // 右上
        { x:  halfW, y:  halfH }, // 右下
        { x: -halfW, y:  halfH }  // 左下
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    localCorners.forEach(p => {
        const rotatedX = p.x * cosA - p.y * sinA; // 点を回転
        const rotatedY = p.x * sinA + p.y * cosA;
        const worldX = centerX + rotatedX; // ワールド座標に変換
        const worldY = centerY + rotatedY;

        minX = Math.min(minX, worldX);
        maxX = Math.max(maxX, worldX);
        minY = Math.min(minY, worldY);
        maxY = Math.max(maxY, worldY);
    });
    return { minX, maxX, minY, maxY };
}
// ====== ゲームロジック ======
function handleSignalSequence() {
    // 詳細なガード節: cars 配列や playerCarIndex の状態をチェック
    if (!cars) {
        const errorMsg = "handleSignalSequence: cars array is null or undefined. Transitioning to title screen.";
        console.error(errorMsg);
        alert(errorMsg); // 追加
        gameState = 'title_screen';
        return;
    }
    if (cars.length === 0) {
        const errorMsg = "handleSignalSequence: cars array is empty. Transitioning to title screen.";
        console.error(errorMsg);
        alert(errorMsg); // 追加
        gameState = 'title_screen';
        return;
    }
    if (playerCarIndex < 0 || playerCarIndex >= cars.length) {
        const errorMsg = `handleSignalSequence: playerCarIndex (${playerCarIndex}) is out of bounds for cars array (length ${cars.length}). Transitioning to title screen.`;
        console.error(errorMsg);
        alert(errorMsg); // 追加
        gameState = 'title_screen';
        return;
    }
    if (!cars[playerCarIndex]) {
        const errorMsg = `handleSignalSequence: cars[playerCarIndex] (cars[${playerCarIndex}]) is undefined. Transitioning to title screen.`;
        console.error(errorMsg);
        alert(errorMsg); // 追加
        gameState = 'title_screen';
        return;
    }
    if (!cars[0]) { // 先頭車両のチェックも重要 (カメラのスクロールロジックで使用)
        const errorMsg = "handleSignalSequence: cars[0] is undefined. Transitioning to title screen.";
        console.error(errorMsg);
        alert(errorMsg); // 追加
        gameState = 'title_screen';
        return;
    }

    const currentTime = Date.now();

    // --- シグナルシーケンス中のカメラ制御 ---
    let targetOffsetX, targetOffsetY;
    const lerpFactor = 0.08; // スムーズ化係数

    if (signalCameraPhase === 'focus_leader') {
        // このフェーズは新しいロジックでは使用されないが、念のため残す場合は
        signalCameraPhase = 'locked_on_player'; // 古いフェーズからの移行

        let actualGridCenterY;
        if (cars && cars.length > 0 && cars[0] && cars[Math.min(NUM_CARS - 1, cars.length - 1)]) {
            const firstCarY = cars[0].y;
            const lastCarInGrid = cars[Math.min(NUM_CARS - 1, cars.length - 1)];
            actualGridCenterY = firstCarY + ((lastCarInGrid.y - firstCarY) / 2);
        } else {
            actualGridCenterY = initialGridY + ((GRID_ROWS - 1) * ROW_SPACING) / 2; // Fallback
        }
        targetOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);
        targetOffsetY = actualGridCenterY - (canvas.height / 2 / ZOOM_LEVEL);

    } else if (signalCameraPhase === 'show_full_grid') {
        ZOOM_LEVEL = initialSignalZoom;
        targetOffsetX = 0; // X座標は常に0

        cameraOffsetX += (targetOffsetX - cameraOffsetX) * lerpFactor;
        // cameraOffsetY += (targetOffsetY - cameraOffsetY) * lerpFactor; // Yは別途計算される

        if (currentTime - signalCameraScrollStartTime > SIGNAL_CAMERA_GRID_VIEW_DURATION) {
            signalCameraPhase = 'zoom_to_player';
            signalCameraScrollStartTime = currentTime;
        }
    } else if (signalCameraPhase === 'zoom_to_player') {
        const playerCar = cars[playerCarIndex];
        if (!playerCar) {
            console.error("Player car not found during signal sequence zoom_to_player phase.");
            signalCameraPhase = 'locked_on_player';
            return;
        }

        const totalSignalLightDuration = (SIGNAL_NUM_LIGHTS * SIGNAL_LIGHT_ON_INTERVAL) + SIGNAL_ALL_LIGHTS_ON_DURATION;
        const zoomPhaseDuration = totalSignalLightDuration - SIGNAL_CAMERA_GRID_VIEW_DURATION;

        if (zoomPhaseDuration <= 0) {
            signalCameraPhase = 'locked_on_player';
            ZOOM_LEVEL = zoomLevelBeforeSignal;
            return;
        }

        const timeInZoomPhase = currentTime - signalCameraScrollStartTime;
        let progress = Math.min(1.0, timeInZoomPhase / zoomPhaseDuration);
        progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; // EaseInOutQuad

        ZOOM_LEVEL = initialSignalZoom + (zoomLevelBeforeSignal - initialSignalZoom) * progress;
        ZOOM_LEVEL = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ZOOM_LEVEL));

        const startZoomForOffsetCalc = initialSignalZoom;
        let actualGridCenterY;
        if (cars && cars.length > 0 && cars[0] && cars[Math.min(NUM_CARS - 1, cars.length - 1)]) {
            const firstCarY = cars[0].y;
            const lastCarInGrid = cars[Math.min(NUM_CARS - 1, cars.length - 1)];
            actualGridCenterY = firstCarY + ((lastCarInGrid.y - firstCarY) / 2);
        } else {
            actualGridCenterY = initialGridY + ((GRID_ROWS - 1) * ROW_SPACING) / 2;
        }

        const initialTargetOffsetX = (canvas.width / 2) - (canvas.width / 2 / startZoomForOffsetCalc);
        const initialTargetOffsetY = actualGridCenterY - (canvas.height / 2 / startZoomForOffsetCalc);
        const finalTargetOffsetX = (canvas.width / 2) - (canvas.width / 2 / zoomLevelBeforeSignal);
        const finalTargetOffsetY = playerCar.y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / zoomLevelBeforeSignal);

        targetOffsetX = initialTargetOffsetX + (finalTargetOffsetX - initialTargetOffsetX) * progress;
        targetOffsetY = initialTargetOffsetY + (finalTargetOffsetY - initialTargetOffsetY) * progress;

        cameraOffsetX += (targetOffsetX - cameraOffsetX) * lerpFactor;
        cameraOffsetY += (targetOffsetY - cameraOffsetY) * lerpFactor;

        if (progress >= 1.0) {
            signalCameraPhase = 'locked_on_player';
            ZOOM_LEVEL = zoomLevelBeforeSignal;
        }

    } else if (signalCameraPhase === 'locked_on_player') {
        const playerCar = cars[playerCarIndex];
         if (!playerCar) {
            targetOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);
            if (cars && cars.length > 0 && cars[0]) { // Yは引き続き計算
                targetOffsetY = cars[0].y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / ZOOM_LEVEL);
            } else {
                targetOffsetY = cameraOffsetY;
            }
        } else {
            targetOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);
            targetOffsetY = playerCar.y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / ZOOM_LEVEL);
        }
        cameraOffsetX += (targetOffsetX - cameraOffsetX) * lerpFactor;
        cameraOffsetY += (targetOffsetY - cameraOffsetY) * lerpFactor;
    } else { // 'idle' または予期せぬ状態
        const fallbackTarget = cars[playerCarIndex] || (cars && cars.length > 0 ? cars[0] : null);
        if (fallbackTarget) {             cameraOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);
             cameraOffsetY = fallbackTarget.y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / ZOOM_LEVEL);
        }
    }
    // --- カメラ制御ここまで ---

    if (signalLightsOnCount < SIGNAL_NUM_LIGHTS) { // まだ全てのライトが点灯していない場合
        if (currentTime - lastSignalChangeTimestamp > SIGNAL_LIGHT_ON_INTERVAL) {
            signalLightsOnCount++;
            lastSignalChangeTimestamp = currentTime;
        }
    } else if (signalLightsOnCount === SIGNAL_NUM_LIGHTS) { // 全てのライトが点灯している場合
        // この状態は SIGNAL_ALL_LIGHTS_ON_DURATION の間維持される
        if (currentTime - lastSignalChangeTimestamp > SIGNAL_ALL_LIGHTS_ON_DURATION) {
            gameState = 'race'; // レース開始！
            signalLightsOnCount = -1; // 消灯状態を示す（描画用）

            const raceStartTime = Date.now(); // この時刻を raceActualStartTime にも使う
            raceActualStartTime = raceStartTime;
            cars.forEach(car => {
                car.gameStartTime = raceStartTime; // AIのスタート遅延計算の基準時刻
            });
            // ZOOM_LEVEL = zoomLevelBeforeSignal; // レース開始時のズームレベル変更をキャンセル
            signalCameraPhase = 'idle'; // カメラフェーズをリセット
            lastBoostActivationTime = raceStartTime; // ブーストタイマーもここで初期化
        }
    }
}

function update() {
    // 全ての画像がロードされていない場合は、更新処理を行わない
    if (!allImagesLoaded) {
        return;
    }

    // === タイトル画面のカメラ制御 ===
    if (gameState === 'title_screen') {
        titleScreenCameraOffsetY += TITLE_SCREEN_SCROLL_SPEED;
        // cameraOffsetX は drawTitleScreen 内で固定値で設定される想定
        // ZOOM_LEVEL も drawTitleScreen 内で固定値で設定される想定
        // タイトル画面では他の更新処理は不要なため、ここでreturnしても良いが、
        // gameLoopの構造上、drawが呼ばれるので、ここではreturnしない。
    }

    if (gameState === 'signal_sequence') {
        handleSignalSequence();
        // シグナルシーケンス中は車の動きを止める
        cars.forEach(car => {
            car.speed = 0;
        });
        // シグナル中はキー入力によるカメラ操作やプレイヤー追従を無効化するため、
        // update内の通常のカメラロジックはスキップ。
        // cameraOffsetX と cameraOffsetY は handleSignalSequence で設定される。
        return; // レースロジックは実行しない
    }

    // === リプレイ状態の更新 ===
    if (gameState === 'replay') {
        handleReplayUpdate();
        // リプレイ中は物理演算やAIはスキップ
        return;
    }

    // レース中の現在時刻を取得
    const currentTime = Date.now();


    if (gameState === 'finished') {
        // レース終了後の処理 (例: プレイヤー入力無効化、AI停止など)
        // 今回は描画でメッセージを出す程度にし、updateは継続するが車の動きは止めるなど検討
        cars.forEach(car => { if (car.hasFinished && car.speed > 0) car.speed = Math.max(0, car.speed - car.friction * 5);}); // ゴール後は減速
    } else if (gameState === 'all_finished') {
        // 全車ゴール後、リプレイ待ち状態
        // replayButton.isVisible は 'all_finished' への遷移時に設定されるため、ここでは必須ではない
        // ただし、状態が直接 'all_finished' で始まる稀なケースを考慮するなら残しても良い
        // 必要であれば車の動きを完全に止める
    }

    // ゴールまでの距離(km)を計算 (レース中のみ)
    if (gameState === 'race') {
        const playerCarY = cars[playerCarIndex].y;
        const rawDistancePixels = playerCarY - GOAL_LINE_Y_POSITION;
        if (rawDistancePixels > 0) {
            // (pixels * (km/h / (px/frame))) / (frames/sec * sec/h) = km
            distanceToGoal = rawDistancePixels * SPEED_TO_KMH_FACTOR / (ASSUMED_FPS * SECONDS_PER_HOUR);
            distanceToGoal = Math.max(0, distanceToGoal); // Ensure non-negative
        } else {
            distanceToGoal = 0; // At or past goal line
        }
    } else if (gameState === 'finished' || gameState === 'all_finished') {
        distanceToGoal = 0; // ゴール後は0km
    } else {
        distanceToGoal = null; // レース中、終了状態以外は計算しない
    }


    let carsSpeedReducedThisFrame = new Set(); // このフレームで速度が減少した車を記録

    // 0. ブーストの発動判定 (BOOST_INTERVALごと)
    if (currentTime - lastBoostActivationTime >= BOOST_INTERVAL) {
        lastBoostActivationTime = currentTime;

        // 一時的な順位付けデータを作成 (y座標と元のインデックスのみ)
        // この時点での順位に基づいてブースト対象を決定
        const carsForRankingBoostCheck = cars.map((car, index) => ({
            y: car.y,
            originalIndex: index
        })).sort((a, b) => a.y - b.y);

        carsForRankingBoostCheck.forEach((rankedCarEntry, sortedIndex) => {
            const actualCarToBoost = cars[rankedCarEntry.originalIndex];
            const currentRankForBoost = sortedIndex + 1;

            // 1位ではない車を対象 (ブースト中でも再度ブーストを適用して時間を延長)
            if (currentRankForBoost > 1) {
                actualCarToBoost.isBoosted = true;
                actualCarToBoost.boostEndTime = currentTime + BOOST_DURATION;
                actualCarToBoost.boostMultiplier = BOOST_FACTOR;
                // console.log(`Car index ${rankedCarEntry.originalIndex} (Rank ${currentRankForBoost}) BOOSTED until ${new Date(actualCarToBoost.boostEndTime).toLocaleTimeString()}`);
            }
        });
    }

    // 1. 各車の状態更新（順位決定、ブースト終了判定、maxSpeed計算）
    //    車のy座標が小さいほど上位とする
    const rankedCarsDataForSpeedCalc = cars
        .map((car, index) => ({
            y: car.y,
            originalIndex: index,
            gridAdjustedMaxSpeed: car.gridAdjustedMaxSpeed // 計算に必要なので渡す
        }))
        .sort((a, b) => a.y - b.y); // y座標で昇順ソート (小さい方が上位)

    rankedCarsDataForSpeedCalc.forEach((rankedCarEntry, sortedIndex) => {
        const actualCar = cars[rankedCarEntry.originalIndex];
        const currentRank = sortedIndex + 1; // 1位からNUM_CARS位

        // プレイヤーの順位を特定
        if (rankedCarEntry.originalIndex === playerCarIndex) {
            currentPlayerRank = currentRank;
        }

        // ブーストの終了判定 (毎フレーム)
        if (actualCar.isBoosted && currentTime > actualCar.boostEndTime) {
            actualCar.isBoosted = false;
            actualCar.boostMultiplier = 1.0;
            // console.log(`Car index ${rankedCarEntry.originalIndex} boost EXPIRED at ${new Date(currentTime).toLocaleTimeString()}`);
        }

        // 1位とのランク差 (0なら1位)
        const rankDifferenceFromLeader = currentRank - 1;

        // ランク差に基づくキャッチアップ係数を計算
        const dynamicBoostFactor = 1 + (rankDifferenceFromLeader * CATCH_UP_SPEED_FACTOR_PER_RANK);

        // 基準最高速度にキャッチアップ係数と現在のブースト係数を適用して、このフレームの最高速度を決定
        actualCar.maxSpeed = actualCar.gridAdjustedMaxSpeed * dynamicBoostFactor * actualCar.boostMultiplier;

        // // 現在の順位を previousRank として記録 (次のフレームの変動表示用)
        // // ただし、ゲーム開始直後などで previousRank がまだ設定されていない場合を考慮
        // if (gameState === 'race') { // レース中のみ更新
        //     actualCar.previousRank = currentRank;
        // }
    });

    // パス1: 全ての車のプレイヤー入力/AIロジックを実行 (速度と角度を決定)
    // Note: This pass now also handles smooth rotation after collision
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const index = i;

        // --- Collision Recovery Rotation ---
        // If the car is recovering from a collision, smoothly rotate towards the target angle
        if (car.isRotatingFromCollision && car.collisionTargetAngle !== null) {
            let angleDiff = car.collisionTargetAngle - car.angle;
            // Normalize the angle difference to be within (-PI, PI]
            angleDiff = (angleDiff + Math.PI) % (2 * Math.PI) - Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            const angleThreshold = 0.05; // Threshold to stop smooth rotation (radians)

            if (Math.abs(angleDiff) > angleThreshold) {
                 // Rotate towards the target angle using the defined speed factor
                 const rotationStep = angleDiff * car.collisionRotationSpeed;
                 car.angle += rotationStep;

                // AIカーの場合、壁からの復帰回転中にわずかに加速して復帰を早める
                if (index !== playerCarIndex) { // AIカーであるか確認
                    // 最高速度の一定割合 (例: 30%) 未満であれば、ゆっくり加速
                    if (car.speed < car.maxSpeed * 0.3) {
                        car.speed += car.acceleration * 0.1; // 通常の加速度の10%で加速
                    }
                }
            } else {
                car.angle = car.collisionTargetAngle; // Snap to the target angle when close enough
                car.isRotatingFromCollision = false;
                car.collisionTargetAngle = null;
            }
            // Skip normal steering/AI logic if rotating from collision
            if (car.isRotatingFromCollision) { // まだ回転中の場合 (isRotatingFromCollisionがtrueのままなら)
                continue; // 通常のAIロジックをスキップして次の車へ
            }
        }
        // --- End Collision Recovery Rotation ---

        if (index === playerCarIndex) {
            // プレイヤーの車のロジック
            const playerCar = car; // 'car' を playerCar として扱う
            // 加速度の計算 (速度が上がるごとに加速度が小さくなる)
            // effectiveMaxSpeedは現在のフレームで動的に計算されたplayerCar.maxSpeedを使用
            const effectiveMaxSpeed = playerCar.speed >= 0 ? playerCar.maxSpeed : playerCar.maxSpeedReverse;
            const speedFactor = Math.abs(playerCar.speed) / effectiveMaxSpeed;
            const currentAcceleration = playerCar.acceleration * (1 - speedFactor);

            // 車の加速・減速
            if (keys.ArrowUp || keys.w) {
                playerCar.speed = Math.min(playerCar.speed + currentAcceleration, playerCar.maxSpeed);
            } else if (keys.ArrowDown || keys.s) {
                playerCar.speed = Math.max(playerCar.speed - playerCar.braking, -playerCar.maxSpeedReverse);
            } else {
                // キーが離されたときの摩擦による減速
                if (playerCar.speed > 0) {
                    playerCar.speed = Math.max(0, playerCar.speed - playerCar.friction);
                } else if (playerCar.speed < 0) {
                    playerCar.speed = Math.min(0, playerCar.speed + playerCar.friction);
                }
            }

            // 車の旋回
            // playerCar.maxSpeed を参照
            const steeringFactor = Math.abs(playerCar.speed) / playerCar.maxSpeed; // maxSpeedで正規化
            const currentTurnSpeed = playerCar.turnSpeed * steeringFactor / 5 * 2 / 3;
            const turnDirection = playerCar.speed >= 0 ? 1 : -1;

            if (keys.autoTurnLeftActive && playerCar.speed !== 0) {
                const targetAngle = -Math.PI / 2; // 真上
                const angleDifference = targetAngle - playerCar.angle;

                // 角度の差を -PI から PI の範囲に正規化
                let normalizedAngleDiff = (angleDifference + Math.PI) % (2 * Math.PI) - Math.PI;
                if (normalizedAngleDiff < -Math.PI) normalizedAngleDiff += 2 * Math.PI;

                const angleThreshold = 0.01; // 許容誤差（ラジアン）

                if (Math.abs(normalizedAngleDiff) > angleThreshold) {
                    // 旋回方向を決定
                    // normalizedAngleDiff が正の場合、現在の角度は目標より小さい（例: -170度で目標が-90度）。角度を増やす（右旋回）。
                    // normalizedAngleDiff が負の場合、現在の角度は目標より大きい（例: -10度で目標が-90度）。角度を減らす（左旋回）。
                    const turnSign = Math.sign(normalizedAngleDiff);

                    // 旋回速度を調整（目標に近いほど遅くするなども考えられるが、ここでは一定）
                    // turnDirection は車の進行方向（前進/後退）なので、旋回方向の制御に使う
                    // Math.sign(normalizedAngleDiff) が正なら右へ、負なら左へ旋回するのが最短
                    playerCar.angle += turnSign * currentTurnSpeed * Math.abs(turnDirection) * 0.8; // turnDirectionの絶対値を使用

                } else {
                    playerCar.angle = targetAngle; // 目標角度に到達したら正確に設定
                    keys.autoTurnLeftActive = false; // 自動旋回終了
                    // console.log("Auto turn left finished.");
                }
            } else {
                // 通常の旋回操作
                if (playerCar.speed !== 0) {
                    if (keys.ArrowLeft || keys.a) {
                        playerCar.angle -= currentTurnSpeed * turnDirection;
                    }
                    if (keys.ArrowRight || keys.d) {
                        playerCar.angle += currentTurnSpeed * turnDirection;
                    }
                }
            }
        } else {
            // AIカーのロジック
            const aiCar = car;

            // AI スタート遅延ロジック
            if (!aiCar.aiHasStarted) {
                if (aiCar.gameStartTime > 0 && currentTime >= aiCar.gameStartTime + aiCar.aiStartDelay) {
                    aiCar.aiHasStarted = true;
                }
            }

            if (aiCar.aiHasStarted) {
                // レーティングに基づく能力調整係数
                // レーティングは1-100の範囲を想定。75を平均的な基準値とする。
                // 新しい計算式: レーティング50が旧0相当(-0.75)、レーティング100が旧100相当(0.25)の影響力を持つ。
                // (aiCar.rating - 87.5) / 50
                // 例: rating 50 -> -0.75, rating 75 -> -0.25, rating 87.5 -> 0, rating 100 -> 0.25
                const ratingFactor = (aiCar.rating - 87.5) / 50;

                // --- AI回避ロジック用実効値 (レーティングで変動) ---
                const EFFECTIVE_OBSTACLE_DETECTION_DISTANCE_FORWARD = (CAR_HEIGHT * 5) * (1 + ratingFactor * 2.4); // ベース距離 CAR_HEIGHT * 5, 最大120%変動 (元の値)
                const EFFECTIVE_AVOID_STEER_ANGLE = (Math.PI / 30) * (1 + ratingFactor * 2.0); // ベース角度 Math.PI / 30, 最大100%変動
                const AI_LATERAL_AVOID_SPEED = 1.7; // AIの横移動速度を固定値に (以前のEFFECTIVE_LATERAL_AVOID_SPEEDから変更)
                const EFFECTIVE_OBSTACLE_DETECTION_WIDTH_FACTOR = 1.0 * (1 + ratingFactor * 1.6); // ベース検知幅係数 1.0, 最大80%変動

                // --- AIブロッキングロジック用実効値 (レーティングで変動) ---
                // let effective_block_probability = 0.3 * (1 + ratingFactor * 3.0); // 元の計算
                // --- (既存のブロッキング確率計算はそのまま) ---

                const current_trackCenterX = canvas.width / 2;
                const current_trackLeftEdge = current_trackCenterX - TRACK_WIDTH / 2;
                const current_trackRightEdge = current_trackCenterX + TRACK_WIDTH / 2;

                const base_block_probability = 0.25; // ベースとなるブロッキング確率を少し下げる (0.3から変更)
                const aggressionFactorForProbability = (aiCar.aggression - 0.5) * 2.0; // aggressionを-1.0～1.0の範囲に変換
                const aggressionInfluenceOnProbability = 0.8; // aggressionが確率に与える影響の強さ (0.0～1.0程度)

                let effective_block_probability = base_block_probability * (1 + ratingFactor * 2.5 + aggressionFactorForProbability * aggressionInfluenceOnProbability); // レーティング影響を少し下げ、攻撃性影響を追加
                effective_block_probability = Math.max(0.05, Math.min(0.9, effective_block_probability)); // 確率を0.05～0.9の範囲にクランプ
                const EFFECTIVE_BLOCK_DETECTION_DISTANCE_BEHIND = (CAR_HEIGHT * 3.0) * (1 + ratingFactor * 2.4); // ベース後方検知距離 CAR_HEIGHT * 3.0, 最大120%変動

                const BASE_BLOCK_DETECTION_WIDTH_LANES = 8; // レーティング75での基準ブロック探知幅 (レーン数)
                const BLOCK_WIDTH_RATING_SENSITIVITY = 1.6; // レーティングがブロック探知幅に与える影響度 (0.8から変更)
                let effectiveBlockDetectionWidthLanes = BASE_BLOCK_DETECTION_WIDTH_LANES * (1 + ratingFactor * BLOCK_WIDTH_RATING_SENSITIVITY);
                effectiveBlockDetectionWidthLanes = Math.max(1, Math.round(effectiveBlockDetectionWidthLanes)); // 最小1レーン、整数に丸める

                // --- AI回避ロジック用定数 (EFFECTIVE_OBSTACLE_DETECTION_DISTANCE_FORWARD に統合されたため、元の定数定義は不要) ---
                // const AI_OBSTACLE_DETECTION_WIDTH_FACTOR = 1.0; // EFFECTIVE_OBSTACLE_DETECTION_WIDTH_FACTOR を使用
                const AI_ANGLE_SMOOTH_FACTOR = 0.1;     // 角度変更の滑らかさ

                // --- AIブロッキングロジック用定数 ---
                // const AI_BLOCK_DETECTION_DISTANCE_BEHIND = CAR_HEIGHT * 3.0; // レーティングで変動するためEFFECTIVE_を使用
                // const AI_BLOCK_PROBABILITY = 0.3; // レーティングで変動するためeffective_を使用

                const NUM_AI_LANES = 12; // AIのレーン数を12から15に増やす
                const AI_LANE_WIDTH = TRACK_WIDTH / NUM_AI_LANES; // 新しいTRACK_WIDTHで再計算される
                // AIレーン全体をコース左端から45px左に寄せる (以前は60px左だったのを15px右に移動)
                // WALL_OFFSET は 0 なので actualCourseVisibleCenterX は canvas.width / 2 と同じ
                const courseLeftEdgeX = current_trackLeftEdge - 50;

                let desiredX = aiCar.x;           // AIカーが目指すべきX座標、デフォルトは現在位置
                let targetAngleForSteering = -Math.PI / 2; // AIカーが目指すべき角度、デフォルトは直進
                let isAvoidingObstacle = false; // 障害物回避中かどうかのフラグ
                let strategicLaneChoiceMade = false; // 戦略的レーン選択を行ったか
                let blockingAttemptMade = false; // ブロッキング試行を行ったかどうかのフラグ
                let isEvadingWallProximity = false; // 壁際回避中かどうかのフラグ

                // ヘルパー関数: X座標からレーンインデックスを取得
                const getLaneIndex = (xPos) => {
                    const index = Math.floor((xPos - courseLeftEdgeX) / AI_LANE_WIDTH);
                    return Math.max(0, Math.min(NUM_AI_LANES - 1, index)); // 範囲内に収める
                };

                // --- 1. 前方の障害物を検知・回避 (最優先) ---
                // (壁際回避のチェックは後方に移動したため、ここの条件から isEvadingWallProximity を削除)
                // if (!isEvadingWallProximity) { // 元の条件
                    for (const otherCar of cars) {
                        if (otherCar === aiCar || otherCar.hasFinished) continue;
                        const yDifference = aiCar.y - otherCar.y;
                        const xDifferenceAbs = Math.abs(aiCar.x - otherCar.x);

                        if (yDifference < EFFECTIVE_OBSTACLE_DETECTION_DISTANCE_FORWARD && yDifference > 0) {
                            if (xDifferenceAbs < CAR_WIDTH * EFFECTIVE_OBSTACLE_DETECTION_WIDTH_FACTOR) {
                                const currentAiLane = getLaneIndex(aiCar.x);
                                const obstacleActualLane = getLaneIndex(otherCar.x);
                                let determinedTargetLane = currentAiLane;
                                let potentialTargetLanes = [];

                                if (obstacleActualLane === currentAiLane) {
                                    if (currentAiLane - 1 >= 0) potentialTargetLanes.push(currentAiLane - 1);
                                    if (currentAiLane + 1 < NUM_AI_LANES) potentialTargetLanes.push(currentAiLane + 1);
                                    if (currentAiLane - 2 >= 0) potentialTargetLanes.push(currentAiLane - 2);
                                    if (currentAiLane + 2 < NUM_AI_LANES) potentialTargetLanes.push(currentAiLane + 2);
                                } else {
                                    const directionToAvoid = Math.sign(currentAiLane - obstacleActualLane);
                                    const oneLaneAway = currentAiLane + directionToAvoid;
                                    if (oneLaneAway >= 0 && oneLaneAway < NUM_AI_LANES) {
                                        potentialTargetLanes.push(oneLaneAway);
                                    }
                                    const twoLanesAway = currentAiLane + directionToAvoid * 2;
                                    if (twoLanesAway >= 0 && twoLanesAway < NUM_AI_LANES) {
                                        potentialTargetLanes.push(twoLanesAway);
                                    }
                                }

                                let validEvasionLanes = potentialTargetLanes.filter(lane => lane !== obstacleActualLane);

                                if (validEvasionLanes.length > 0) {
                                    determinedTargetLane = validEvasionLanes[Math.floor(Math.random() * validEvasionLanes.length)];
                                }

                                if (determinedTargetLane !== currentAiLane) {
                                    desiredX = courseLeftEdgeX + AI_LANE_WIDTH * determinedTargetLane + AI_LANE_WIDTH / 2;
                                    isAvoidingObstacle = true;
                                    break;
                                }
                            }
                        }
                        if (isAvoidingObstacle) break;
                    }
                // } // 元の if(!isEvadingWallProximity) の閉じ括弧

                // --- 2. 戦略的レーン選択 (前方障害物回避が作動していない場合) ---
                if (!isAvoidingObstacle) { // isEvadingWallProximity のチェックを削除
                    const currentAiLane = getLaneIndex(aiCar.x);
                    let laneCongestion = new Array(NUM_AI_LANES).fill(0); // 各レーンの混雑度 (前方車両数)

                    // 各レーンの混雑度を計算
                    for (const otherCar of cars) {
                        if (otherCar === aiCar || otherCar.hasFinished) continue; // 自分自身とゴール済みの車はスキップ
                        const yDifference = aiCar.y - otherCar.y; // 正ならotherCarが前方

                        if (yDifference > 0 && yDifference < EFFECTIVE_OBSTACLE_DETECTION_DISTANCE_FORWARD) {
                            const otherCarLane = getLaneIndex(otherCar.x);
                            if (otherCarLane >= 0 && otherCarLane < NUM_AI_LANES) {
                                laneCongestion[otherCarLane]++;
                            }
                        }
                    }

                    // レーティングに基づいて評価対象レーンと移動判断
                    const numSideLanesToEvaluate = Math.max(0, Math.round(1 + ratingFactor * 6)); // 片側に評価するレーン数 (0, 1, ... , or 4) (3から変更)
                    let bestLane = currentAiLane;
                    let minCongestionInConsideredLanes = laneCongestion[currentAiLane];

                    // 左右の評価対象レーンをチェック
                    for (let i = 1; i <= numSideLanesToEvaluate; i++) {
                        const targetLaneLeft = currentAiLane - i;
                        if (targetLaneLeft >= 0) {
                            if (laneCongestion[targetLaneLeft] < minCongestionInConsideredLanes) {
                                minCongestionInConsideredLanes = laneCongestion[targetLaneLeft];
                                bestLane = targetLaneLeft;
                            }
                        }
                        const targetLaneRight = currentAiLane + i;
                        if (targetLaneRight < NUM_AI_LANES) {
                            if (laneCongestion[targetLaneRight] < minCongestionInConsideredLanes) {
                                minCongestionInConsideredLanes = laneCongestion[targetLaneRight];
                                bestLane = targetLaneRight;
                            }
                        }
                    }

                    // 移動判断の閾値 (レーティングが高いほど積極的に移動)
                    const congestionDifferenceThreshold = 2 * (1 - ratingFactor * 2.0); // 例: rating 100なら約1.0台差、rating 50なら約3.0台差で移動 (1.0から変更)

                    if (bestLane !== currentAiLane && (laneCongestion[currentAiLane] - minCongestionInConsideredLanes >= congestionDifferenceThreshold)) {
                        desiredX = courseLeftEdgeX + AI_LANE_WIDTH * bestLane + AI_LANE_WIDTH / 2;
                        strategicLaneChoiceMade = true;
                    }
                }
                // --- 戦略的レーン選択ロジックここまで ---

                // --- 3. AIブロッキングロジック (前方回避も戦略的レーン選択も行われなかった場合) ---
                if (!isAvoidingObstacle && !strategicLaneChoiceMade && Math.random() < effective_block_probability) { // isEvadingWallProximity のチェックを削除
                    const currentAiLane = getLaneIndex(aiCar.x);
                    let bestTargetToBlock = null;
                    let closestYDifference = EFFECTIVE_BLOCK_DETECTION_DISTANCE_BEHIND; // Start with max detection distance

                    for (const otherCar of cars) {
                        if (otherCar === aiCar || otherCar.hasFinished) continue; // 自分自身とゴール済みの車はスキップ

                        const yDifferenceBehind = otherCar.y - aiCar.y; // 正の値ならotherCarがaiCarより後方

                        // Basic conditions: behind, within detection range (implicitly via closestYDifference init),
                        // faster, and closer than previously found best.
                        //自分より遅い車もブロック対象に含めるため、速度条件を変更
                        if (yDifferenceBehind > 0 && // Must be behind
                            yDifferenceBehind < closestYDifference && // Must be closer than the current best candidate
                            // otherCar.speed > aiCar.speed) { // Original: And faster
                            otherCar.speed > aiCar.speed * 0.8) { // New: otherCar is at least 80% of aiCar's speed
                            const otherCarLane = getLaneIndex(otherCar.x);
                            // 後方の車が隣のレーンにいて、自分より速い場合
                            const laneDifference = Math.abs(currentAiLane - otherCarLane); // レーン差の絶対値
                            if (laneDifference >= 1 && laneDifference <= effectiveBlockDetectionWidthLanes) { // レーティングに応じた探知幅を使用
                                // ブロックを試みる: otherCarと同じレーンに移動しようとする
                                let targetBlockLane = otherCarLane;

                                // ターゲットレーンがコース範囲内か確認
                                if (targetBlockLane >= 0 && targetBlockLane < NUM_AI_LANES) {
                                    // This otherCar is a better candidate to block
                                    closestYDifference = yDifferenceBehind;
                                    bestTargetToBlock = otherCar;
                                }
                            }
                        }
                    }

                    // If a best target was identified, set desiredX to block it
                    if (bestTargetToBlock) {
                        const targetLaneForBlocking = getLaneIndex(bestTargetToBlock.x);
                        desiredX = courseLeftEdgeX + AI_LANE_WIDTH * targetLaneForBlocking + AI_LANE_WIDTH / 2;
                        blockingAttemptMade = true;
                    }
                }
                // --- AIブロッキングロジックここまで ---

                // --- 4. 壁際回避ロジック (上記のいずれも作動していない場合) ---
                if (!isAvoidingObstacle && !strategicLaneChoiceMade && !blockingAttemptMade) {
                    const WALL_PROXIMITY_THRESHOLD_AI = CAR_WIDTH * 0.65;

                    // 左壁への接近判定ロジックは削除されました。

                    // 右壁への接近判定 (車の右端が壁に近づいているか。左壁回避が作動していない場合のみ)
                    if (aiCar.x + CAR_WIDTH > current_trackRightEdge - WALL_PROXIMITY_THRESHOLD_AI) {
                        const currentAiLane = getLaneIndex(aiCar.x);
                        let targetEvasionLane = -1;
                        for (let i = 1; i <= 2; i++) { // 左隣のレーンから最大2レーン先までチェック
                            const potentialLane = currentAiLane - i;
                            if (potentialLane >= 0) {
                                // (安全なレーンかどうかのチェックロジックは左壁と同様)
                                // ... (省略: isLaneSafe のチェック) ...
                                // 簡略化のため、上記左壁の isLaneSafe チェックを再利用すると仮定
                                // 実際には右壁用の targetEvasionLane を見つけるロジックが必要
                                // ここでは、もし安全なレーンが見つかったら isEvadingWallProximity = true とすると仮定
                                isEvadingWallProximity = true; // 仮の代入
                            } else { break; }
                        }
                    }
                }
                // --- 壁衝突回避ロジックは撤去済み ---
                // courseLeftEdgeX は既にAIロジックの冒頭で新しい値で定義されています。

                const isTargetXDifferentAndNotReached = (desiredX !== aiCar.x) && (Math.abs(aiCar.x - desiredX) > AI_LATERAL_AVOID_SPEED * 0.05);

                // ステアリング角度の設定
                if (isTargetXDifferentAndNotReached) {
                    if (desiredX < aiCar.x) { // 左へ移動
                        targetAngleForSteering = -Math.PI / 2 - EFFECTIVE_AVOID_STEER_ANGLE;
                    } else if (desiredX > aiCar.x) { // 右へ移動
                        targetAngleForSteering = -Math.PI / 2 + EFFECTIVE_AVOID_STEER_ANGLE;
                    }
                    // desiredX === aiCar.x の場合は targetAngleForSteering は -Math.PI / 2 のまま (直進)
                }

                // X座標の更新 (回避行動)
                if (isTargetXDifferentAndNotReached) {
                    aiCar.x += Math.sign(desiredX - aiCar.x) * AI_LATERAL_AVOID_SPEED; // 固定値を使用
                } else if (aiCar.x !== desiredX) {
                    // 目標に十分近づいたら、正確な位置に設定
                    aiCar.x = desiredX;
                }

                // Angleの更新 (ステアリング) - プレイヤーと同様に、速度が遅いほど曲がりにくくする
                let aiSteeringSpeedFactor = 0.0; // Default to no turning if speed is zero or maxSpeed is zero

                if (aiCar.maxSpeed > 0.01) { // Avoid division by zero or near-zero maxSpeed
                    aiSteeringSpeedFactor = Math.abs(aiCar.speed) / aiCar.maxSpeed;
                    // Note: If aiCar.speed can exceed aiCar.maxSpeed, aiSteeringSpeedFactor can be > 1.0.
                    // This is similar to the player's steeringFactor and means slightly increased agility
                    // during overspeed moments, which is generally acceptable.
                }
                // If aiCar.speed is 0, aiSteeringSpeedFactor will be 0.
                // This results in effectiveAiAngleSmoothFactor being 0, so the car won't turn,
                // matching the player's behavior where currentTurnSpeed becomes 0 at zero speed.

                const effectiveAiAngleSmoothFactor = AI_ANGLE_SMOOTH_FACTOR * aiSteeringSpeedFactor;
                aiCar.angle += (targetAngleForSteering - aiCar.angle) * effectiveAiAngleSmoothFactor;

                // 前進ロジック
                // プレイヤーと同じ加速度と最高速度目標を使用
                const wantsToAccelerate = aiCar.speed < aiCar.maxSpeed;

                if (wantsToAccelerate) {
                    // 加速する場合のロジック (プレイヤーがアクセルを踏んでいる状態に相当)
                    const effectiveTargetMaxSpeed = aiCar.speed >= 0 ? aiCar.maxSpeed : aiCar.maxSpeedReverse;
                    const speedFactor = Math.abs(aiCar.speed) / effectiveTargetMaxSpeed; // effectiveTargetMaxSpeed が0でないことを期待
                    const currentAcceleration = aiCar.acceleration * (1 - speedFactor);
                    aiCar.speed = Math.min(aiCar.speed + currentAcceleration, aiCar.maxSpeed);
                } else {
                    // 加速していない場合 (最高速度に達しているか、または減速を意図する場合)
                    // プレイヤーがアクセルを離している状態に相当し、摩擦が適用される
                    if (aiCar.speed > 0) {
                        aiCar.speed = Math.max(0, aiCar.speed - aiCar.friction);
                    }
                    // AIはこのシンプルなモデルでは後退しないため、後退時の摩擦は考慮しない
                }
            } else { // if (!aiCar.aiHasStarted)
                aiCar.speed = 0; // Keep speed at 0 if not yet started
            }
        }

        // 注意: この時点ではx, yはまだ更新しない
    }

    // パス2: 全ての車の基本的な移動を適用 (x, y座標を更新)
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        car.x += Math.cos(car.angle) * car.speed;
        car.y += Math.sin(car.angle) * car.speed;
    }

    // パス2.5: ゴール判定
    if (gameState === 'race') { // レース中のみゴール判定を行う
        // Y座標でソートして、同着の場合でも正しく順位をつけられるようにする準備
        const carsToCheckFinish = [...cars].sort((a,b) => a.y - b.y);

        carsToCheckFinish.forEach((car) => {
            if (!car.hasFinished && car.y <= GOAL_LINE_Y_POSITION) {
                car.hasFinished = true;
                car.finishTime = currentTime;
                carsFinishedCount++;
                // finalRank は carsFinishedCount に基づいて設定されるため、
                // 複数の車が同フレームでゴールした場合、処理順でランクが決まる可能性がある。
                // より厳密には、このループの前に y でソートされたリストを使うべきだが、
                // carsFinishedCount がインクリメントされるため、最初の車が rank 1 を取る。
                car.finalRank = carsFinishedCount;
                // car.speed = 0; // ゴールしたら停止させる場合

                const originalCarIndex = cars.findIndex(c => c === car); // 元のcars配列でのインデックスを取得
                if (originalCarIndex === playerCarIndex) {
                    gameState = 'finished'; // プレイヤーがゴールしたらレース終了状態へ
                }

                // 最初にゴールした車のタイムを記録
                if (car.finalRank === 1 && winnerFinishTime === 0) {
                    winnerFinishTime = car.finishTime;
                }
            }
        });

    } else if (gameState === 'finished') {
        // レース終了後もAIカーがゴール判定を通過できるようにする
        cars.forEach(car => {
            if (!car.hasFinished && car.y <= GOAL_LINE_Y_POSITION) {
                car.hasFinished = true;
                if (car.finishTime === 0) car.finishTime = currentTime; // まだタイムがなければ設定
                if (car.finalRank === 0) { // まだ最終順位がなければ設定
                    carsFinishedCount++;
                    car.finalRank = carsFinishedCount;
                    // プレイヤーがゴール後にAIが最初にゴールする場合のwinnerFinishTimeも考慮
                    if (car.finalRank === 1 && winnerFinishTime === 0) {
                        winnerFinishTime = car.finishTime;
                    }
                }
            }
        });
    }

    // レース履歴の記録: gameStateが 'race' または 'finished' の間は記録を続ける
    // 記録停止は gameState が 'all_finished' に遷移することで制御される
    if ((gameState === 'race' || gameState === 'finished') && !careerPlayerTeamName) { // キャリアモードでは記録しない
        const currentCarStates = cars.map(car => ({
            x: car.x, y: car.y, angle: car.angle, speed: car.speed,
            hasFinished: car.hasFinished, finalRank: car.finalRank // ゴール情報も記録
        }));
        raceHistory.push({ carStates: currentCarStates, timestamp: currentTime });
    }

    // gameState を 'all_finished' に遷移させる条件のチェック
    // このチェックは、現在のフレームのレース履歴が記録された後に行う
    if ((gameState === 'race' || gameState === 'finished') && !(gameState === 'all_finished')) { // all_finished にまだ遷移していない場合のみ
        const allCarsPhysicallyFinished = (carsFinishedCount >= NUM_CARS);
        const thirtySecondsPastWinner = (winnerFinishTime > 0 && currentTime >= winnerFinishTime + 30000);

        if (allCarsPhysicallyFinished || thirtySecondsPastWinner) {
            gameState = 'all_finished';
            console.log(`Race ${currentRaceInSeason}/${RACES_PER_SEASON} of Season ${currentSeasonNumber} ended. All cars physically finished: ${allCarsPhysicallyFinished}, 30s past winner: ${thirtySecondsPastWinner}. Transitioning to all_finished.`);

            // --- ポイント加算処理 (キャリアモードの場合のみ) ---
            if (careerPlayerTeamName) {
                cars.forEach(car => {
                    const currentRacePointsSystem = currentRaceType.points; // 現在のレースのポイントシステムを使用
                    if (car.hasFinished && car.finalRank > 0 && car.finalRank <= currentRacePointsSystem.length) {
                        const pointsEarned = currentRacePointsSystem[car.finalRank - 1];
                        if (!careerDriverSeasonPoints[car.driverName]) {
                            careerDriverSeasonPoints[car.driverName] = 0;
                        }
                        careerDriverSeasonPoints[car.driverName] += pointsEarned;
                        console.log(`${car.driverName} (Rank: ${car.finalRank}) earned ${pointsEarned} points. Total: ${careerDriverSeasonPoints[car.driverName]}`);
                    }
                });

                // チームポイントの更新 (シーズン累計)
                // careerDriverSeasonPoints を元に全チームのポイントを再集計する
                // driverLineups は現在のシーズンのチーム構成を反映している
                for (const teamNameInLineup in driverLineups) {
                    careerTeamSeasonPoints[teamNameInLineup] = 0; // 毎回リセットして再計算
                    const team = driverLineups[teamNameInLineup];
                    team.drivers.forEach(driver => {
                        if (careerDriverSeasonPoints[driver.name]) {
                            careerTeamSeasonPoints[teamNameInLineup] += careerDriverSeasonPoints[driver.name];
                        }
                    });
                }
                console.log("Career Team Season Points updated:", JSON.parse(JSON.stringify(careerTeamSeasonPoints)));

                // キャリアモードのレース終了時に、次レースのグリッド順のために結果を保存
                const finishedCarsSortedForGrid = [...cars]
                    .filter(c => c.hasFinished && c.finalRank > 0) // 完走し、有効な順位を持つ車のみ
                    .sort((a, b) => a.finalRank - b.finalRank);

                if (finishedCarsSortedForGrid.length === NUM_CARS) { // 全車分の結果があるか確認
                    previousRaceFinishingOrder = finishedCarsSortedForGrid.map(c => c.driverName);
                    console.log("Previous race finishing order stored for next race grid:", previousRaceFinishingOrder);
                } else {
                    console.warn(`Could not store previous race finishing order for next grid. Expected ${NUM_CARS} ranked cars, found ${finishedCarsSortedForGrid.length}. Next race will use default grid.`);
                    previousRaceFinishingOrder = []; // 不完全な場合はリセットしてデフォルトグリッドにフォールバック
                };
            }
            // --- ポイント加算処理ここまで ---

            // === 自動セーブ処理 (キャリアモードの場合のみ) ===
            // if (careerPlayerTeamName) {
            //     const autoSaveSlotIndex = 0; // 自動セーブはスロット0に固定
            //     // gatherSaveDataは現在のgameState ('all_finished') を使用してセーブデータを作成します。
            //     // previousGameStateBeforeSaveLoad はこの時点ではnullなので、
            //     // gatherSaveData内の currentGameStateToSave は gameState ('all_finished') になります。
            //     const saveData = gatherSaveData();
            //     saveGameToSlot(autoSaveSlotIndex, saveData);
            //     loadSaveSlotsMetadata(); // セーブスロットのメタデータを更新
            //     console.log(`Game automatically saved to Slot ${autoSaveSlotIndex + 1} after race finish.`);
            //     alert(`レース結果がスロット ${autoSaveSlotIndex + 1} に自動セーブされました。`);
            // }
            // === 自動セーブ処理ここまで ===

            if (!replayButton.isVisible) { // ボタンがまだ表示されていなければ設定
                // ボタンのX位置をキャリアとクイックレースで共通化
                const commonButtonX = canvas.width / 2 - replayButton.width / 2; // replayButtonの幅を基準に中央揃え
                replayButton.x = commonButtonX;
                replayButton.y = canvas.height - replayButton.height - 30;                
                replayButton.isVisible = !careerPlayerTeamName; // キャリアモードではリプレイボタンを表示しない
                if (careerPlayerTeamName) {
                    careerNextButton.isVisible = true; // キャリアならNEXTボタンも表示
                } else {
                    quickRaceBackButton.isVisible = true; // クイックレースならBackボタン表示
                }
            }
        }
    }

    // レース開始後1秒でシグナルを完全に非表示にするロジック (レース中のみ)
    // このロジックは gameState の変更とは独立して動作
    if (gameState === 'race' && signalLightsOnCount === -1 && raceActualStartTime > 0 && (currentTime - raceActualStartTime > 1000)) {
        signalLightsOnCount = SIGNAL_NUM_LIGHTS + 1; // シグナルを非表示にするための特別な値
    }

    // パス3: 車同士の衝突判定と応答
    for (let i = 0; i < cars.length; i++) {
        for (let j = i + 1; j < cars.length; j++) {
            const carA = cars[i];
            const carB = cars[j];

            const aabbA = getRotatedAABB(carA);
            const aabbB = getRotatedAABB(carB);

            // AABBでの衝突判定
            if (aabbA.maxX > aabbB.minX &&
                aabbA.minX < aabbB.maxX &&
                aabbA.maxY > aabbB.minY &&
                aabbA.minY < aabbB.maxY) {

                // Y座標を比較して後方にいた車を特定 (Yが大きい方が後方)
                if (carA.y > carB.y) { // carAがcarBの後方
                    if (!carsSpeedReducedThisFrame.has(i)) {
                        carA.speed *= 0.95;
                        carsSpeedReducedThisFrame.add(i);
                    }
                } else if (carB.y > carA.y) { // carBがcarAの後方
                    if (!carsSpeedReducedThisFrame.has(j)) {
                        carB.speed *= 0.95;
                        carsSpeedReducedThisFrame.add(j);
                    }
                }
                // Y座標が全く同じ場合は、このルールではどちらも減速しない
            }
        }
    }
    // パス4: 壁との衝突判定と最高速度超過時の処理
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const trackCenterX = canvas.width / 2;
        // WALL_OFFSET は 0 なので、トラックの描画上の端が壁となる
        const trackLeftEdge = trackCenterX - TRACK_WIDTH / 2 + WALL_OFFSET;
        const trackRightEdge = trackCenterX + TRACK_WIDTH / 2 - WALL_OFFSET; // WALL_OFFSETが0なので実際は TRACK_WIDTH/2

        // const cosAngle = Math.cos(car.angle); // AABB関数内で計算
        // const sinAngle = Math.sin(car.angle);

        // 車の中心座標
        const carCenterX = car.x + CAR_WIDTH / 2;
        // const carCenterY = car.y + CAR_HEIGHT / 2; // Y座標は芝生判定に直接使わない

        // 車の中心を原点としたときの四隅のローカル座標
        const corners = [
            { x: -CAR_WIDTH / 2, y: -CAR_HEIGHT / 2 }, // 左上
            { x:  CAR_WIDTH / 2, y: -CAR_HEIGHT / 2 }, // 右上
            { x:  CAR_WIDTH / 2, y:  CAR_HEIGHT / 2 }, // 右下
            { x: -CAR_WIDTH / 2, y:  CAR_HEIGHT / 2 }  // 左下
        ];

        // 回転を考慮したAABBを取得
        const aabb = getRotatedAABB(car);
        let hitWall = false;

        if (aabb.minX < trackLeftEdge) {
            // 左の壁に衝突
            car.x += (trackLeftEdge - aabb.minX); // 位置を補正
            hitWall = true;
        }
        if (aabb.maxX > trackRightEdge) {
            // 右の壁に衝突
            car.x -= (aabb.maxX - trackRightEdge); // 位置を補正
            hitWall = true;
        }

        if (hitWall) {
            // X方向の速度成分を反転させることで跳ね返りを表現
            const speedX = Math.cos(car.angle) * car.speed;
            const speedY = Math.sin(car.angle) * car.speed;

            // X方向の速度を反転
            // Use a higher factor (e.g., 1.0 for perfect elasticity in X) for angle calculation
            // The overall speed reduction is handled separately below.
            // Using 1.0 here means the X-component of velocity reverses perfectly for angle calculation.
            // const newSpeedX = -speedX * 1.0; // 目標角度を固定するため不要

            // Calculate the desired post-collision angle based on velocity vectors
            // const desiredAngle = Math.atan2(speedY, newSpeedX); // 元のロジック
            // car.collisionTargetAngle = desiredAngle; // 元のロジック
            car.collisionTargetAngle = -Math.PI / 2; // 壁に衝突したら、コース前方（真上）を向くように目標角度を設定
            car.isRotatingFromCollision = true; // スムーズな回転を開始

            if (Math.abs(car.speed) < 0.1) car.speed = 0; // 非常に低速なら停止
        }

        // 最高速度超過時のゆったりとした減速処理
        if (car.speed > car.maxSpeed) {
            car.speed -= OVER_MAX_SPEED_DECELERATION;
            // 減速しすぎて最高速度を下回った場合は、最高速度にクランプする (ただし、衝突直後の速度減衰とは別)
            // 衝突による速度減衰は既に car.speed *= 0.95 で行われている
            if (car.speed < car.maxSpeed) {
                car.speed = car.maxSpeed; // 修正: 最高速度に設定
            }
        } else if (car.speed < -car.maxSpeedReverse) {
            car.speed += OVER_MAX_SPEED_DECELERATION;
            // 加速（絶対値としては減速）しすぎて後退最高速度を上回った場合は、後退最高速度にクランプする
            if (car.speed > -car.maxSpeedReverse) {
                car.speed = -car.maxSpeedReverse;
            }
        }

        // Apply 90% speed reduction upon collision (moved from inside hitWall block)
        if (hitWall) {
             car.speed *= 0.9; // Reduce speed to 90% upon collision
        }
    }

    // 通常のレース中のカメラ追従ロジック
    // gameStateが 'race', 'finished', 'all_finished' の場合に実行
    // (signal_sequence および replay 中は、それぞれの専用関数内でカメラが制御される)
    if (gameState === 'race' || gameState === 'finished' || gameState === 'all_finished') {
        const playerCarForCamera = cars[playerCarIndex];
        cameraOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);

        // プレイヤーオブジェクトやそのY座標が有効かチェック
        if (playerCarForCamera && typeof playerCarForCamera.y === 'number' && isFinite(playerCarForCamera.y)) {
            // プレイヤーの車がY軸方向の中央に来るように調整 (ZOOM_LEVEL を考慮)
            cameraOffsetY = playerCarForCamera.y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / ZOOM_LEVEL);
        } else {
            // console.error("Camera tracking failed during race: Player data invalid.");
        }
    }
} // update関数の閉じ括弧を追加

// === リプレイ更新ロジック ===
function handleReplayUpdate() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastReplayUpdateTime;
    // lastReplayUpdateTime = currentTime; //  !isReplayPaused の中で更新

    if (!isReplayPaused && raceHistory.length > 0) {
        lastReplayUpdateTime = currentTime; // 再生中のみ時刻を更新

        // 再生速度と経過時間に基づいてフレームを進める
        const framesToAdvance = Math.round(deltaTime / (1000 / ASSUMED_FPS) * replaySpeedMultiplier);

        replayFrameIndex += framesToAdvance;

        if (replayFrameIndex >= raceHistory.length - 1) {
            replayFrameIndex = raceHistory.length - 1; // 最終フレームに留まる
            isReplayPaused = true; // 最後まで行ったら一時停止
            replayButton.isVisible = true; // リプレイボタンを再表示

            // ボタンの位置が未設定の場合（通常は 'all_finished' で設定されるが念のため）
            if (replayButton.x === 0 && replayButton.y === 0) {
                 replayButton.x = canvas.width / 2 - replayButton.width / 2;
                 replayButton.y = canvas.height - replayButton.height - 30;
            }
            console.log("Replay ended. Click 'Replay' button to watch again.");

        } else if (replayFrameIndex < 0) {
            replayFrameIndex = 0;
        }

        // 記録された状態を現在の車の状態に適用
        const currentFrameData = raceHistory[replayFrameIndex];
        currentFrameData.carStates.forEach((recordedState, index) => {
            // 描画のために、実際のcars配列のプロパティを上書きする
            Object.assign(cars[index], recordedState);
        });

        // カメラ位置を更新 (選択された車の記録された位置に追尾)
        const followedCarState = cars[selectedReplayCarIndex]; // cars配列は既にリプレイデータで更新されている
        cameraOffsetX = (canvas.width / 2) - (canvas.width / 2 / ZOOM_LEVEL);
        cameraOffsetY = followedCarState.y + (CAR_HEIGHT / 2) - (canvas.height * PLAYER_CAMERA_Y_POSITION_RATIO / ZOOM_LEVEL); // Yは追尾
    }

    // TODO: リプレイ操作UIの入力処理 (マウスイベントなど)
}

// === 新しい描画関数: ドライバー選択画面 ===
function drawDriverSelectionScreen() {
    ctx.save();
    // 背景
    ctx.fillStyle = 'rgba(30, 30, 30, 0.98)'; // 少し濃くして他の画面と区別
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px "Formula1 Display Wide", "Arial Black", sans-serif'; // サイズアップ、フォールバック追加
    ctx.textAlign = 'center';
    if (careerPlayerTeamName) {
        ctx.fillText(`SELECT DRIVER FOR ${careerPlayerTeamName.toUpperCase()}`, canvas.width / 2, 50);
    } else {
        ctx.fillText('SELECT YOUR DRIVER', canvas.width / 2, 50);
    }

    // 操作説明
    ctx.font = 'italic 16px Arial';
    ctx.fillStyle = 'grey';
    ctx.textAlign = 'center';
    if (!careerPlayerTeamName) {
        ctx.fillText('Click on a driver name to start the race.', canvas.width / 2, canvas.height - 30);
    } else {
        // careerModeButton.isVisible = false; // キャリアモードでチーム選択後は非表示 (タイトル画面に移動したため不要)
        ctx.fillText(`Click on a driver name to confirm your choice for ${careerPlayerTeamName}.`, canvas.width / 2, canvas.height - 30);
    }
    ctx.textAlign = 'left'; // textAlignをリセット


    // --- 3列レイアウトのための設定 ---
    const teams = careerPlayerTeamName ? [careerPlayerTeamName] : Object.keys(driverLineups);
    const numTeams = teams.length;
    const numColumns = careerPlayerTeamName ? 1 : 4; // キャリアモードでチーム選択済みの場合は1列
    const columnWidth = careerPlayerTeamName ? canvas.width : canvas.width / numColumns; // 1列の場合は全幅
    const horizontalPadding = 20; // 各列内の左右のパディング (元に戻すか調整)
    // const machineImageDisplayWidth = CAR_WIDTH * 0.5; // マシン画像削除のため不要
    // const machineImageDisplayHeight = CAR_HEIGHT * 0.5; // マシン画像削除のため不要
    // const spaceAfterMachineImage = 10; // マシン画像削除のため不要

    let startYForRow = 100; // 最初の行の開始Y座標 (少し上に調整)
    const itemHeight = 30;  // 各行の高さ
    const driverTextSize = 20; // ドライバー名のフォントサイズ
    const teamNameHeight = itemHeight; // チーム名表示行の高さ (itemHeightと同じでよい)
    const driverNameIndent = 10;    // チーム名からのドライバー名のインデント
    const teamBlockPaddingY = 40;   // チームブロックの行間の縦のスペース

    let currentTeamIndex = 0;
    while (currentTeamIndex < numTeams) {
        let maxDriversInCurrentRow = 0;
        let teamsToDrawInRow = [];

        // 現在の行に表示するチームを収集 (最大3チーム)
        for (let col = 0; col < numColumns && currentTeamIndex < numTeams; col++) { // numTeams を使用
            const teamName = teams[currentTeamIndex];
            teamsToDrawInRow.push({
                name: teamName,
                drivers: driverLineups[teamName].drivers,
                image: driverLineups[teamName].image, // チーム画像
                colIndex: col
            });
            maxDriversInCurrentRow = Math.max(maxDriversInCurrentRow, driverLineups[teamName].drivers.length);
            currentTeamIndex++;
        }

        // 収集したチームを描画
        teamsToDrawInRow.forEach(teamData => {
            let teamDisplayX = teamData.colIndex * columnWidth + horizontalPadding;
            if (careerPlayerTeamName) { // キャリアモードでチーム選択済みの場合、中央に表示
                // チーム名やドライバー名が描画される領域の開始Xを調整
                teamDisplayX = canvas.width / 2 - 150; // 仮の中央寄せ（テキスト幅に応じて調整が必要）
            }
            let currentYForTeamContent = startYForRow;

            // チーム名
            ctx.font = `bold ${driverTextSize + 4}px "Formula1 Display Regular", "Arial Black", sans-serif`; // サイズアップ、フォールバック追加
            ctx.fillStyle = '#e0e0e0'; // チーム名は薄いグレー
            ctx.textAlign = 'left';
            ctx.fillText(teamData.name.toUpperCase(), teamDisplayX, currentYForTeamContent); // 既に大文字
            currentYForTeamContent += teamNameHeight; // チーム名の下へ

            // マシン画像の描画ロジックを削除
            // currentYForTeamContent の調整もマシン画像分は不要になる

            // ドライバー名
            teamData.drivers.forEach((driver) => {
                ctx.font = `bold ${driverTextSize}px "Formula1 Display Regular", Arial, sans-serif`; // boldを追加、フォールバックはArialのまま
                ctx.fillStyle = 'white'; // ドライバー名は白
                // driver オブジェクトや driver.name が null または undefined の場合にエラーが発生するのを防ぐため、
                // 安全にアクセスし、フォールバックテキスト "N/A" を使用します。
                const driverNameText = (driver && driver.name) ? driver.name : "N/A";
                ctx.fillText(` • ${driverNameText}`, teamDisplayX + driverNameIndent * 2, currentYForTeamContent);
                currentYForTeamContent += itemHeight;
            });
        });
        // 次の行の開始Y座標を更新
        // マシン画像の高さを除外
        startYForRow += teamNameHeight + (maxDriversInCurrentRow * itemHeight) + teamBlockPaddingY;
    }
    ctx.restore();
}

// ====== タイトル画面描画関数 ======
function drawTitleScreen() {
    ctx.save();

    // === タイトル画面用のコース描画 ===
    // cameraOffsetX と ZOOM_LEVEL をタイトル画面用に設定
    const titleZoomLevel = 1.0;     const titleCameraOffsetX = (canvas.width / 2) - (canvas.width / 2 / titleZoomLevel);

    ctx.scale(titleZoomLevel, titleZoomLevel);
    ctx.translate(-titleCameraOffsetX, -titleScreenCameraOffsetY); // Yオフセットは更新される変数を使用

    // `draw` 関数からコース描画ロジックを移植 (必要な部分のみ)
    const visibleTop = titleScreenCameraOffsetY;
    const visibleBottom = titleScreenCameraOffsetY + canvas.height / titleZoomLevel;
    const segmentHeight = canvas.height / titleZoomLevel;
    const startSegmentY = Math.floor(visibleTop / segmentHeight) * segmentHeight - segmentHeight;

    const KERB_WIDTH = 30;
    const KERB_BLOCK_LENGTH = 40;

    for (let y = startSegmentY; y < visibleBottom + segmentHeight; y += segmentHeight) {
        // 路肩の芝生 (緑)
        ctx.fillStyle = '#0a0';
        ctx.fillRect(titleCameraOffsetX, y, canvas.width / titleZoomLevel, segmentHeight);

        // 路面 (灰色)
        ctx.fillStyle = '#555555';
        ctx.fillRect(canvas.width / 2 - TRACK_WIDTH / 2, y, TRACK_WIDTH, segmentHeight);

        // 白線 (中央線)
        ctx.fillStyle = 'white';
        ctx.fillRect(canvas.width / 2 - 2, y, 4, segmentHeight);

        // 白線 (路肩線)
        const trackLeftEdgeX = canvas.width / 2 - TRACK_WIDTH / 2;
        const trackRightEdgeX = canvas.width / 2 + TRACK_WIDTH / 2;
        ctx.fillRect(trackLeftEdgeX - 2, y, 4, segmentHeight);
        ctx.fillRect(trackRightEdgeX - 2, y, 4, segmentHeight);

        // 縁石
        for (let kerbY = 0; kerbY < segmentHeight; kerbY += KERB_BLOCK_LENGTH) {
            ctx.fillStyle = (Math.floor(kerbY / KERB_BLOCK_LENGTH) % 2 === 0) ? '#c00000' : 'white';
            const currentBlockLength = Math.min(KERB_BLOCK_LENGTH, segmentHeight - kerbY);
            ctx.fillRect(trackLeftEdgeX, y + kerbY, KERB_WIDTH, currentBlockLength);
            ctx.fillRect(trackRightEdgeX - KERB_WIDTH, y + kerbY, KERB_WIDTH, currentBlockLength);
        }
    }
    // === コース描画ここまで ===

    ctx.restore(); // カメラ変形を元に戻す
    ctx.save();    // UI描画用に再度保存

    // タイトル画面のUI要素 (コースの上に描画するための半透明背景)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.7)'; // Alpha値を調整して透明度を設定
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ゲームタイトル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FORMULA STRAIGHT', canvas.width / 2, canvas.height / 2 - 100); // 仮のタイトル

    // クイックレースボタン
    quickRaceButton.isVisible = true;
    quickRaceButton.x = canvas.width / 2 - quickRaceButton.width / 2;
    quickRaceButton.y = canvas.height / 2;
    ctx.fillStyle = 'rgba(0, 150, 200, 0.8)';
    // マウスオーバー時のハイライト (オプション)
    // const mousePos = {x: currentMouseX, y: currentMouseY}; // マウス位置を別途追跡する必要がある
    // if (quickRaceButton.isClicked(mousePos.x, mousePos.y)) {
    //    ctx.fillStyle = 'rgba(0, 180, 240, 0.9)';
    // }

    ctx.fillRect(quickRaceButton.x, quickRaceButton.y, quickRaceButton.width, quickRaceButton.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial'; // フォントサイズ調整
    ctx.fillText(quickRaceButton.text, quickRaceButton.x + quickRaceButton.width / 2, quickRaceButton.y + quickRaceButton.height / 2 + 7); // テキスト位置調整

    // キャリアモードボタン
    careerModeButton.isVisible = true;
    careerModeButton.x = canvas.width / 2 - careerModeButton.width / 2;
    careerModeButton.y = quickRaceButton.y + quickRaceButton.height + 30; // クイックレースボタンの下
    ctx.fillStyle = 'rgba(200, 100, 0, 0.8)';
    ctx.fillRect(careerModeButton.x, careerModeButton.y, careerModeButton.width, careerModeButton.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial'; // フォントサイズ調整
    ctx.fillText(careerModeButton.text, careerModeButton.x + careerModeButton.width / 2, careerModeButton.y + careerModeButton.height / 2 + 7); // テキスト位置調整

    // ロードゲームボタン
    loadGameButton.isVisible = true;
    loadGameButton.x = canvas.width / 2 - loadGameButton.width / 2;
    loadGameButton.y = careerModeButton.y + careerModeButton.height + 30;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.fillRect(loadGameButton.x, loadGameButton.y, loadGameButton.width, loadGameButton.height);
    ctx.fillStyle = 'white';
    ctx.fillText(loadGameButton.text, loadGameButton.x + loadGameButton.width / 2, loadGameButton.y + loadGameButton.height / 2 + 7);

    ctx.textAlign = 'left'; // textAlignをリセット
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア

    if (gameState === 'title_screen') {
        drawTitleScreen();
        return; // タイトル画面の描画のみ
    }
    if (gameState === 'save_game_selection') {
        drawSaveLoadScreen(true); // true for save mode
        return;
    }
    if (gameState === 'load_game_selection') {
        drawSaveLoadScreen(false); // false for load mode
        return;
    }
    if (gameState === 'driver_selection') {
        drawDriverSelectionScreen();
        return; // ゲームワールドの描画は行わない
    }
    if (gameState === 'career_machine_performance') {
        drawCareerMachinePerformanceScreen();
        return; // マシンパフォーマンス画面はフルスクリーンUIなので、ここで描画を終了
    }
    if (gameState === 'career_team_selection') {
        drawCareerTeamSelectionScreen();
        return; // ゲームワールドの描画は行わない
    }
    if (gameState === 'career_roster') {
        drawCareerRosterScreen();
        return; // ゲームワールドの描画は行わない
    }
    if (gameState === 'career_season_end') {
        drawCareerSeasonEndScreen();
        return; // シーズン終了画面はフルスクリーンUIなので、ここで描画を終了
    }
    if (gameState === 'career_team_standings') {
        drawCareerTeamStandingsScreen();
        return; // チームスタンディング画面はフルスクリーンUI
    }
    if (gameState === 'career_team_offers') {
        drawCareerTeamOffersScreen();
        return; // チームオファー画面はフルスクリーンUI
    }
    // 上記のいずれかのUI画面が描画された場合は、それぞれのifブロック内でreturnされる。
    // それ以外の場合（レース中など）は、以下のメイン描画ロジックが実行される。

    // カメラのズームとオフセットを適用
    ctx.save(); // Save the current state before applying camera transformations
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-cameraOffsetX, -cameraOffsetY);

    // === 無限スクロールする直線コースの描画 ===
    const visibleTop = cameraOffsetY;
    const visibleBottom = cameraOffsetY + canvas.height / ZOOM_LEVEL;
    const segmentHeight = canvas.height / ZOOM_LEVEL;
    const startSegmentY = Math.floor(visibleTop / segmentHeight) * segmentHeight - segmentHeight;

    // 縁石の設定
    const KERB_WIDTH = 30; // 縁石の幅を15に変更
    const KERB_BLOCK_LENGTH = 40; // 縁石の各ブロックの長さ

    for (let y = startSegmentY; y < visibleBottom + segmentHeight; y += segmentHeight) {
        // 路肩の芝生 (緑) - 路面の外側全体を覆う
        ctx.fillStyle = '#0a0'; // 草の色
        ctx.fillRect(cameraOffsetX, y, canvas.width / ZOOM_LEVEL, segmentHeight);

        // 路面 (灰色) - 中央部分
        ctx.fillStyle = '#555555'; // 路面の色を少し暗く変更
        ctx.fillRect(canvas.width / 2 - TRACK_WIDTH / 2, y, TRACK_WIDTH, segmentHeight);

        // 白線 (中央線)
        ctx.fillStyle = 'white';
        ctx.fillRect(canvas.width / 2 - 2, y, 4, segmentHeight); // 中央線を実線として描画

        // 白線 (路肩線)
        // ctx.fillStyle = 'white'; // 既に設定済み
        const trackLeftEdgeX = canvas.width / 2 - TRACK_WIDTH / 2;
        const trackRightEdgeX = canvas.width / 2 + TRACK_WIDTH / 2;

        ctx.fillRect(trackLeftEdgeX - 2, y, 4, segmentHeight); // 左側の白線
        ctx.fillRect(trackRightEdgeX - 2, y, 4, segmentHeight); // 右側の白線

        // 縁石の描画 (路肩線の内側、路面の上)
        // 左側の縁石
        for (let kerbY = 0; kerbY < segmentHeight; kerbY += KERB_BLOCK_LENGTH) {
            ctx.fillStyle = (Math.floor(kerbY / KERB_BLOCK_LENGTH) % 2 === 0) ? '#c00000' : 'white'; // 赤色を暗めに変更
            const currentBlockLength = Math.min(KERB_BLOCK_LENGTH, segmentHeight - kerbY);
            ctx.fillRect(trackLeftEdgeX, y + kerbY, KERB_WIDTH, currentBlockLength);
        }
        // 右側の縁石
        for (let kerbY = 0; kerbY < segmentHeight; kerbY += KERB_BLOCK_LENGTH) {
            ctx.fillStyle = (Math.floor(kerbY / KERB_BLOCK_LENGTH) % 2 === 0) ? '#c00000' : 'white'; // 赤色を暗めに変更
            const currentBlockLength = Math.min(KERB_BLOCK_LENGTH, segmentHeight - kerbY);
            ctx.fillRect(trackRightEdgeX - KERB_WIDTH, y + kerbY, KERB_WIDTH, currentBlockLength);
        }
    }

    // === ゴールラインの描画 ===
    if (GOAL_LINE_Y_POSITION > cameraOffsetY - GOAL_LINE_THICKNESS && GOAL_LINE_Y_POSITION < cameraOffsetY + canvas.height / ZOOM_LEVEL) {
        const squareSize = 20;
        const numSquares = Math.ceil(TRACK_WIDTH / squareSize);
        for (let i = 0; i < numSquares; i++) {
            ctx.fillStyle = (i % 2 === 0) ? 'white' : 'black';
            const x = (canvas.width / 2 - TRACK_WIDTH / 2) + i * squareSize;
            const width = (i === numSquares - 1) ? TRACK_WIDTH - i * squareSize : squareSize; // 最後の四角の幅調整
            ctx.fillRect(x, GOAL_LINE_Y_POSITION, width, GOAL_LINE_THICKNESS);
        }
         // ゴールラインの上下に少し太い白線を追加して目立たせる (任意)
        ctx.fillStyle = 'white';
        ctx.fillRect(canvas.width / 2 - TRACK_WIDTH / 2 - 5, GOAL_LINE_Y_POSITION - 5, TRACK_WIDTH + 10, 5);
        ctx.fillRect(canvas.width / 2 - TRACK_WIDTH / 2 - 5, GOAL_LINE_Y_POSITION + GOAL_LINE_THICKNESS, TRACK_WIDTH + 10, 5);

        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', canvas.width / 2, GOAL_LINE_Y_POSITION - 15);
        ctx.textAlign = 'left'; // 他の描画のためにtextAlignを戻す
    }

    // 全ての車の描画
    cars.forEach(car => {
        // 画像がロードされているか確認
        if (car.image && car.image.complete && car.image.naturalHeight !== 0) {
            ctx.save();
            // 回転軸を車の中心に設定
            ctx.translate(car.x + CAR_WIDTH / 2, car.y + CAR_HEIGHT / 2);

            // car.angleに合わせて回転させて描画します。
            ctx.rotate(car.angle);

            ctx.drawImage(car.image, -CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);

            // ドライバー名の描画 (レース中とリプレイ中)
            if (gameState === 'signal_sequence' || gameState === 'race' || gameState === 'finished' || gameState === 'all_finished' || gameState === 'replay') {
                ctx.font = 'bold 16px Arial'; // フォントサイズを12pxに変更
                // プレイヤーの車は黄色、AIカーは白で表示
                const originalIndex = cars.findIndex(c => c === car); // cars配列内での元のインデックスを取得
                if (originalIndex === playerCarIndex) {
                    ctx.fillStyle = 'yellow';
                } else {
                    ctx.fillStyle = 'white';
                }
                ctx.textAlign = 'center';
                // マシンの上中央に名前を表示 (Y座標を調整して画像の上に配置)
                ctx.fillText(car.driverName, 0, -CAR_HEIGHT / 2 - 5); // X=0 (中心), Yはマシンの高さ半分より少し上
            }
            ctx.restore();
        } else {
            // 画像がロードされていない場合、一時的に四角を描画
            ctx.fillStyle = 'red';
            ctx.fillRect(car.x, car.y, CAR_WIDTH, CAR_HEIGHT);
        }
    });

    ctx.restore(); // ズームとオフセットの描画状態を元に戻す

    // === スタートシグナルの描画 (HUDとして) ===
    function drawSignalLightsUI() {
        // リプレイ中や全車ゴール後は表示しない
        if (gameState === 'loading' || gameState === 'finished' || gameState === 'all_finished' || gameState === 'replay' || signalLightsOnCount > SIGNAL_NUM_LIGHTS) {
            return;
        }

        const lightRadius = 15;
        const lightSpacing = 10;
        const totalWidth = SIGNAL_NUM_LIGHTS * (2 * lightRadius + lightSpacing) - lightSpacing;
        let startX = canvas.width / 2 - totalWidth / 2;
        const lightY = 40;

        for (let i = 0; i < SIGNAL_NUM_LIGHTS; i++) {
            ctx.beginPath();
            ctx.arc(startX + i * (2 * lightRadius + lightSpacing) + lightRadius, lightY, lightRadius, 0, Math.PI * 2);
            if (gameState === 'signal_sequence' && i < signalLightsOnCount) {
                ctx.fillStyle = 'red'; // 点灯
            } else if (gameState === 'race' && signalLightsOnCount === -1) { // レース開始直後（全消灯）
                ctx.fillStyle = 'darkgrey'; // 消灯
            } else {
                ctx.fillStyle = 'darkred'; // 消灯 (またはシーケンス中の未点灯)
            }
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }
    }
    drawSignalLightsUI();

    // デバッグ情報 (ズームとオフセットの影響を受けないように、restore()後に描画)
    let playerCarForDebug = null;
    if (cars && cars.length > 0 && playerCarIndex >= 0 && playerCarIndex < cars.length) {
        playerCarForDebug = cars[playerCarIndex];
    }

    const debugLineHeight = 18;
    const debugPadding = 10;
    const debugInfoX = canvas.width - 230; // 右端からのX座標
    const debugInfoStartY = canvas.height - (7 * debugLineHeight) - debugPadding; // 下端からのY座標

    ctx.fillStyle = 'black';
    ctx.font = '14px Arial'; // フォントサイズを少し調整

    if (playerCarForDebug) {
        ctx.fillText(`Angle: ${(playerCarForDebug.angle * 180 / Math.PI).toFixed(2)}`, debugInfoX, debugInfoStartY);
        ctx.fillText(`Car X: ${playerCarForDebug.x.toFixed(2)}`, debugInfoX, debugInfoStartY + debugLineHeight);
        ctx.fillText(`Car Y: ${playerCarForDebug.y.toFixed(2)}`, debugInfoX, debugInfoStartY + debugLineHeight * 2);
        ctx.fillText(`Player Driver: ${playerCarForDebug.driverName}`, debugInfoX, debugInfoStartY + debugLineHeight * 6);
    } else {
        ctx.fillText(`Angle: N/A`, debugInfoX, debugInfoStartY);
        ctx.fillText(`Car X: N/A`, debugInfoX, debugInfoStartY + debugLineHeight);
        ctx.fillText(`Car Y: N/A`, debugInfoX, debugInfoStartY + debugLineHeight * 2);
        ctx.fillText(`Player Driver: N/A`, debugInfoX, debugInfoStartY + debugLineHeight * 6);
    }
    ctx.fillText(`Cam X (world): ${cameraOffsetX.toFixed(2)}`, debugInfoX, debugInfoStartY + debugLineHeight * 3);
    ctx.fillText(`Cam Y (world): ${cameraOffsetY.toFixed(2)}`, debugInfoX, debugInfoStartY + debugLineHeight * 4);
    ctx.fillText(`Zoom: ${ZOOM_LEVEL.toFixed(1)}`, debugInfoX, debugInfoStartY + debugLineHeight * 5);

    // === 順位表の描画 (HUDとして) ===
    function drawRankingsUI() {
        // レース中またはシグナル中のみ表示。終了後は最終リザルトを表示するためここでは描画しない
        if (gameState !== 'race' && gameState !== 'signal_sequence') return;

        const rankingBoxX = 10;
        const headerLineHeight = 22;
        const rankingBoxY = 30 + headerLineHeight; // ヘッダー表示分下にずらす
        const lineHeight = 18;
        const padding = 10; // パディングを少し増やす

        // === シーズン/レース情報ヘッダー ===
        ctx.font = 'bold 16px "Formula1 Display Wide", Arial, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        if (careerPlayerTeamName !== null) { // キャリアモードの場合のみシーズン/レース情報を表示
            const raceInfoText = `SEASON ${currentSeasonNumber} - RACE ${currentRaceInSeason}/${RACES_PER_SEASON} (${currentRaceType.name.toUpperCase()})`;
            ctx.fillText(raceInfoText, rankingBoxX, rankingBoxY - lineHeight / 2 - padding + 2); // 位置調整
        } else { // クイックレースの場合
            ctx.fillText("QUICK RACE", rankingBoxX, rankingBoxY - lineHeight / 2 - padding + 2); // 位置調整
        }
        // === ヘッダーここまで ===

        const rankedCarsForUI = [...cars]
            .map((car, originalIndex) => ({
                y: car.y,
                driverName: car.driverName,
                startingGridRank: car.startingGridRank, // 順位変動表示は削除するが、データとしては残しても良い
                isPlayer: originalIndex === playerCarIndex,
                originalIndex: originalIndex,
                speed: car.speed // インターバル計算のために速度を追加
            }))
            .sort((a, b) => a.y - b.y); // y座標でソート


        ctx.font = 'bold 14px Verdana'; // フォントサイズを少し小さく
        const visibleRanks = rankedCarsForUI.length; // 全車表示

        // 枠と背景の描画
    const boxWidth = 240; // 枠の幅 (インターバル表示スペースを考慮)
        const boxHeight = visibleRanks * lineHeight + padding * 1.5; // 高さをパディング分調整
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // 少し濃い背景
        ctx.fillRect(rankingBoxX - padding, rankingBoxY - lineHeight, boxWidth, boxHeight); // Y開始位置調整
        ctx.strokeStyle = 'rgba(200,200,200,0.7)'; // 枠の色を少し明るく
        ctx.lineWidth = 2;
        ctx.strokeRect(rankingBoxX - padding, rankingBoxY - lineHeight + padding / 2, boxWidth, boxHeight);
        ctx.textAlign = 'left'; // デフォルトのtextAlign

        for (let i = 0; i < visibleRanks; i++) {
            const rankData = rankedCarsForUI[i];
            const currentActualRank = i + 1; // ソート後のインデックスが現在の順位
            // let rankChangeIndicator = ""; // 順位変動表示は削除

            let intervalText = "";

            if (gameState === 'signal_sequence') {
                if (i === 0) { // 1位
                    intervalText = " Leader";
                } else { // 2位以降
                    intervalText = " +0.0s"; // スタート前は0.0s表示
                }
            } else { // gameState === 'race'
                if (i > 0) { // 2位以降の車
                    const previousCarData = rankedCarsForUI[i-1];
                    const yDifference = rankData.y - previousCarData.y; // Y座標の差 (ピクセル)

                    // 前の車の速度が0.1ピクセル/フレームより大きい場合、タイム差を計算
                    if (previousCarData.speed > 0.1) {
                        // yDifference (ピクセル) / previousCarData.speed (ピクセル/フレーム) = フレーム差
                        // フレーム差 / ASSUMED_FPS (フレーム/秒) = 秒差
                        const timeIntervalSeconds = yDifference / previousCarData.speed / ASSUMED_FPS;

                        if (timeIntervalSeconds < 0.05 && timeIntervalSeconds > -0.05) { // ほぼ0の場合 (0.05秒未満)
                            intervalText = " +0.0s";
                        } else if (timeIntervalSeconds >= 0) {
                            intervalText = ` +${timeIntervalSeconds.toFixed(1)}s`;
                        } else {
                            // このケースは通常発生しないはず (yDifferenceが常に正のため)
                            intervalText = ` ${timeIntervalSeconds.toFixed(1)}s`;
                        }
                    } else if (yDifference > 1) { // 前の車がほぼ停止していて、1ピクセル以上の距離がある場合
                        intervalText = ` +${yDifference.toFixed(0)}px`; // ピクセル差を直接表示
                    } else {
                        // ほぼ同位置で前の車もほぼ停止している場合
                        intervalText = " Close"; // または "+0px"
                    }
                } else {
                    // 1位の車
                    intervalText = " Leader";
                }
            }

            // ドライバー名を描画 (左寄せ)
            const driverNameText = `${currentActualRank}. ${rankData.driverName}`;
            ctx.fillStyle = rankData.isPlayer ? 'yellow' : 'white'; // プレイヤーを強調
            ctx.fillText(driverNameText, rankingBoxX, rankingBoxY + i * lineHeight);

            // インターバルテキストを描画 (右寄せ)
            ctx.textAlign = 'right';
            ctx.fillText(intervalText, rankingBoxX + boxWidth - padding * 2, rankingBoxY + i * lineHeight); // 右端からpadding分離して描画
            ctx.textAlign = 'left'; // textAlignを元に戻す

        }
    }
    drawRankingsUI();

    // === 最終リザルトの描画 ===
    function drawFinalResultsUI() {
        if (gameState !== 'finished' && gameState !== 'all_finished' && gameState !== 'replay') return; // リプレイ中も表示

        const resultsBoxX = 10;
        const resultsBoxY = 30; // 順位表と同じ位置から開始
        const lineHeight = 18;
        const padding = 5;
        ctx.font = 'bold 14px Verdana';

        const finishedCarsSorted = cars.filter(car => car.hasFinished).sort((a, b) => a.finalRank - b.finalRank);
        if (finishedCarsSorted.length === 0) return;

        const winnerTime = finishedCarsSorted[0].finishTime;

        const boxWidth = 280; // タイム差表示のため少し幅を広げる
        const boxHeight = Math.min(finishedCarsSorted.length, NUM_CARS) * lineHeight + padding; // 全車表示

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(resultsBoxX - padding, resultsBoxY - lineHeight + padding / 2, boxWidth, boxHeight);
        ctx.strokeStyle = 'white'; // 枠の色を白に変更
        ctx.lineWidth = 2;
        ctx.strokeRect(resultsBoxX - padding, resultsBoxY - lineHeight + padding / 2, boxWidth, boxHeight);

        for (let i = 0; i < finishedCarsSorted.length; i++) {
            const carData = finishedCarsSorted[i];
            let timeDiffText = "";
            if (i > 0) { // 2位以降
                const diff = (carData.finishTime - winnerTime) / 1000; // 秒単位に変換
                timeDiffText = ` +${diff.toFixed(3)}s`;
            } else {
                timeDiffText = " (Winner)";
            }
            const resultText = `${carData.finalRank}. ${carData.driverName}${timeDiffText}`;
            // 最終リザルトではプレイヤーのインデックスを直接参照できないため、driverNameで比較するか、
            // carオブジェクトにisPlayerフラグを持たせるなどの対応が必要。
            // ここでは、cars配列のplayerCarIndexを使って元のオブジェクトのisPlayerを判定する。
            // const originalCarObject = cars[playerCarIndex]; // これはプレイヤーオブジェクト
            // finishedCarsSortedの各要素が元のcars配列のどの車に対応するかを見つける必要がある
            // 簡単のため、ここではdriverNameで比較する（同名ドライバーがいない前提）
            // より堅牢なのは、各車にユニークIDを持たせるか、mapでisPlayer情報を渡すこと
            let isPlayerCarInResult = (carData.driverName === cars[playerCarIndex].driverName);


            ctx.fillStyle = isPlayerCarInResult ? 'yellow' : 'white';
            ctx.fillText(resultText, resultsBoxX, resultsBoxY + i * lineHeight);
        }
    }
    drawFinalResultsUI();

    // レース終了メッセージ
    if (gameState === 'finished' || gameState === 'all_finished') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 50, 400, 100); // ボックスを少し大きく
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(gameState === 'all_finished' ? 'All Cars Finished!' : 'Race Finished!', canvas.width / 2, canvas.height / 2 - 10);
        // プレイヤーの最終順位はリザルト表に含まれるため、個別の表示は削除
        ctx.textAlign = 'left';
    }

    // === キャンバス内ズームスライダーの描画 ===
    // スライダーの位置を計算 (canvasサイズに依存するため、draw内で毎回計算)
    sliderTrackX = canvas.width - SLIDER_MARGIN_RIGHT - SLIDER_TRACK_WIDTH;
    sliderTrackY = SLIDER_MARGIN_TOP; // calculateInitialZoomLevelで中央になるよう設定済み

    // トラックの描画
    ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
    ctx.fillRect(sliderTrackX, sliderTrackY, SLIDER_TRACK_WIDTH, SLIDER_TRACK_HEIGHT);

    // つまみのY座標を計算
    // (SLIDER_TRACK_HEIGHT - SLIDER_THUMB_HEIGHT) は、つまみがトラック内で動ける最大範囲
    const thumbPositionRatio = (ZOOM_LEVEL - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
    const thumbY = sliderTrackY + thumbPositionRatio * (SLIDER_TRACK_HEIGHT - SLIDER_THUMB_HEIGHT);
    const thumbX = sliderTrackX + (SLIDER_TRACK_WIDTH / 2) - (SLIDER_THUMB_WIDTH / 2); // つまみをトラックの中央に配置

    // つまみの描画
    ctx.fillStyle = 'rgba(79, 79, 79, 0.9)';
    ctx.fillRect(thumbX, thumbY, SLIDER_THUMB_WIDTH, SLIDER_THUMB_HEIGHT);
    ctx.strokeStyle = 'rgba(79, 79, 79, 1)';
    ctx.strokeRect(thumbX, thumbY, SLIDER_THUMB_WIDTH, SLIDER_THUMB_HEIGHT);

    // ズーム値のテキスト描画
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.fillText(`${ZOOM_LEVEL.toFixed(1)}x`, sliderTrackX - 35, sliderTrackY + SLIDER_TRACK_HEIGHT / 2 + 5);


    // === スピードモニターの描画 (左下) ===
    // スピードモニターは、レース関連のステートでのみ表示し、playerCarが有効な場合のみデータを表示
    const raceRelatedStatesForSpeedMonitor = ['signal_sequence', 'race', 'finished', 'all_finished'];
    if (raceRelatedStatesForSpeedMonitor.includes(gameState)) {
        let speedText = "Speed: N/A";
        let playerCarForMonitor = null;

        // cars配列とplayerCarIndexが有効かチェックし、プレイヤーの車情報を取得
        if (cars && cars.length > 0 && playerCarIndex >= 0 && playerCarIndex < cars.length && cars[playerCarIndex]) {
            playerCarForMonitor = cars[playerCarIndex];
        }

        if (playerCarForMonitor) {
            const displaySpeed = playerCarForMonitor.speed >= 0 ? playerCarForMonitor.speed : -playerCarForMonitor.speed;
            speedText = `Speed: ${Math.round(displaySpeed * 20)} km/h`;
        }

        // 描画処理
        ctx.font = 'bold 24px Arial'; // フォント設定を先に行い、measureText で使用
        const textWidth = ctx.measureText(speedText).width;
        const textHeight = 24; // フォントサイズに基づく高さ
        const padding = 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(padding, canvas.height - textHeight - padding * 2, textWidth + padding * 2, textHeight + padding);

        ctx.fillStyle = 'white';
        ctx.fillText(speedText, padding * 2, canvas.height - padding - 5);
    }


    // === 順位モニターの描画 (右上) ===
    // ゴールまでの距離(km)表示を右上に追加
    if (gameState !== 'replay') { // リプレイ中以外は表示 (以前の条件を簡略化)
        let distanceDisplayString = "";
        if (gameState === 'finished') { // この条件は上のifで弾かれるはずだが念のため
            distanceDisplayString = "Finished!";
        } else if (gameState === 'race' && distanceToGoal !== null) {
            distanceDisplayString = `To Goal: ${distanceToGoal.toFixed(3)} km`;
        } else if (gameState === 'signal_sequence') {
             distanceDisplayString = "Starting...";
        } else if (gameState === 'all_finished') {
            distanceDisplayString = "All Finished";
        } else { // race state but distanceToGoal is null (e.g. player not moving at very start)
             distanceDisplayString = "To Goal: --- km";
        }

        ctx.font = 'bold 18px Arial';
        const distanceTextMetrics = ctx.measureText(distanceDisplayString);
        const distancePadding = 10;
        const distanceBoxWidth = distanceTextMetrics.width + distancePadding * 2;
        const distanceBoxHeight = 18 + distancePadding * 1.5; // フォントサイズに合わせる
        const distanceBoxX = canvas.width - distanceBoxWidth - distancePadding;
        const distanceBoxY = distancePadding;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(distanceBoxX, distanceBoxY, distanceBoxWidth, distanceBoxHeight);

        // テキスト
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left'; // 左揃えで描画
        ctx.fillText(distanceDisplayString, distanceBoxX + distancePadding, distanceBoxY + 18 + distancePadding / 2 - 2);
    }

    // === リプレイUIの描画 (仮) ===
    if (gameState === 'replay') {
        // リプレイフレーム情報
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Replay: Frame ${replayFrameIndex} / ${raceHistory.length - 1}`, 10, canvas.height - 50);
        ctx.fillText(`Speed: ${replaySpeedMultiplier.toFixed(1)}x ${isReplayPaused ? "(Paused)" : ""}`, 10, canvas.height - 30);

        // 追尾ドライバー選択リスト
        const replayUiDriverListYStart = 50;
        const replayUiDriverListLineHeight = 20;
        const replayUiDriverListXStart = 10;
        ctx.font = '14px Verdana';

        // リアルタイムの順位でソートするための準備
        // cars配列はhandleReplayUpdateで現在のリプレイフレームの状態に更新されている
        // 元のインデックスを保持しつつソートする
        const sortedCarsForReplayList = cars
            .map((car, index) => ({
                ...car, // carオブジェクトの全プロパティをコピー
                originalIndex: index // 元のインデックスを保持 (selectedReplayCarIndexとの比較用)
            }))
            .sort((a, b) => a.y - b.y); // Y座標で昇順ソート (小さい方が上位)

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        // sortedCarsForReplayList.length を使用
        ctx.fillRect(replayUiDriverListXStart - 5, replayUiDriverListYStart - replayUiDriverListLineHeight, 200, sortedCarsForReplayList.length * replayUiDriverListLineHeight + 10);

        sortedCarsForReplayList.forEach((carData, sortedIndex) => { // ソート済みリストでループ
            // carData.originalIndex が selectedReplayCarIndex と一致するかで判定
            if (carData.originalIndex === selectedReplayCarIndex) {
                ctx.fillStyle = 'yellow'; // 現在選択中のドライバーをハイライト
            } else {
                ctx.fillStyle = 'white';
            }
            // 表示する順位はソート後のインデックス (sortedIndex + 1)
            ctx.fillText(`${sortedIndex + 1}. ${carData.driverName}`, replayUiDriverListXStart, replayUiDriverListYStart + sortedIndex * replayUiDriverListLineHeight);
        });
    }

    // Replayボタンの描画 (isVisibleがtrueの時、gameStateに依存しない)
    // この描画は他のUI要素より手前（最後の方）で行う
    if (replayButton.isVisible && !careerPlayerTeamName) { // キャリアモードでは表示しない
        // gameStateが 'finished' や 'all_finished' の時のスタイルを流用
        // または、リプレイ終了時専用のスタイルを定義しても良い
        ctx.fillStyle = 'rgba(100, 100, 200, 0.8)';
        ctx.fillRect(replayButton.x, replayButton.y, replayButton.width, replayButton.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(replayButton.text, replayButton.x + replayButton.width / 2, replayButton.y + replayButton.height / 2 + 8);
        ctx.textAlign = 'left'; // textAlignを戻す
    }

    // gameState === 'all_finished' の時のボタン描画
    if (gameState === 'all_finished' && careerPlayerTeamName) {
        // 「NEXT」ボタンの描画 (リプレイボタンより上)
        if (careerNextButton.isVisible) {
            // X座標はリプレイボタンと共通化された commonButtonX を使う想定だが、
            // replayButton.x が既に設定されているのでそれを利用
            careerNextButton.x = replayButton.x + (replayButton.width - careerNextButton.width) / 2; // リプレイボタンの中央に合わせる
            careerNextButton.y = replayButton.y - careerNextButton.height - 10; // リプレイボタンの少し上

            ctx.fillStyle = 'rgba(200, 100, 0, 0.9)'; // オレンジ系のボタン
            ctx.fillRect(careerNextButton.x, careerNextButton.y, careerNextButton.width, careerNextButton.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(careerNextButton.text, careerNextButton.x + careerNextButton.width / 2, careerNextButton.y + careerNextButton.height / 2 + 7);
            ctx.textAlign = 'left'; // textAlignを戻す
        }
    } else if (gameState === 'all_finished' && careerPlayerTeamName === null) { // クイックレースの場合
        if (quickRaceBackButton.isVisible) {
            quickRaceBackButton.x = replayButton.x + (replayButton.width - quickRaceBackButton.width) / 2; // リプレイボタンの中央に合わせる
            quickRaceBackButton.y = replayButton.y - quickRaceBackButton.height - 10; // リプレイボタンの少し上

            ctx.fillStyle = 'rgba(100, 100, 100, 0.9)'; // グレー系のボタン
            ctx.fillRect(quickRaceBackButton.x, quickRaceBackButton.y, quickRaceBackButton.width, quickRaceBackButton.height);
            ctx.fillStyle = 'white'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
            ctx.fillText(quickRaceBackButton.text, quickRaceBackButton.x + quickRaceBackButton.width / 2, quickRaceBackButton.y + quickRaceBackButton.height / 2 + 7);
            ctx.textAlign = 'left'; // textAlignを戻す
        }
    }

    // キャリアモードのロスタースクリーンで「シーズン開始」ボタンを描画 (正しい位置に移動)
    if (careerStartSeasonButton.isVisible && gameState === 'career_roster') {
        // ... (careerStartSeasonButton の描画ロジックは変更なし、位置のみ修正)
        //     ctx.fillStyle = 'rgba(0, 150, 50, 0.8)';
        //     ctx.fillRect(nextStepButton.x, nextStepButton.y, nextStepButton.width, nextStepButton.height);
        //     ctx.fillStyle = 'white';
        //     ctx.font = 'bold 20px Arial';
        //     ctx.textAlign = 'center';
        //     ctx.fillText(nextStepButton.text, nextStepButton.x + nextStepButton.width / 2, nextStepButton.y + nextStepButton.height / 2 + 7);
        //     ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 150, 50, 0.9)'; // 緑系のボタン
    }

    // 汎用セーブボタンの描画 (特定の画面でのみ表示)
    if (generalSaveButton.isVisible) {
        ctx.fillStyle = 'rgba(0, 180, 100, 0.8)';
        ctx.fillRect(generalSaveButton.x, generalSaveButton.y, generalSaveButton.width, generalSaveButton.height);
        ctx.fillStyle = 'white'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
        ctx.fillText(generalSaveButton.text, generalSaveButton.x + generalSaveButton.width / 2, generalSaveButton.y + generalSaveButton.height / 2 + 6);
        ctx.textAlign = 'left';
        
    }
}


// ====== キャリアモード関連の関数 ======
function handleCareerModeButtonClick() {
    gameState = 'career_name_entry'; // 一時的に状態を変更
    const firstName = prompt("キャリアモードへようこそ！\nあなたの名を入力してください:", careerPlayerName.firstName || "Player");
    if (firstName === null || firstName.trim() === "") {
        alert("名の入力がキャンセルされたか、空です。");
        gameState = 'driver_selection';
        return;
    }

    const lastName = prompt("あなたの姓を入力してください:", careerPlayerName.lastName || "One");
    if (lastName === null || lastName.trim() === "") {
        alert("姓の入力がキャンセルされたか、空です。");
        gameState = 'driver_selection';
        return;
    }

    careerPlayerName.firstName = firstName.trim();
    careerPlayerName.lastName = lastName.trim();
    const formattedDisplayName = formatPlayerDisplayName(careerPlayerName.firstName, careerPlayerName.lastName);
    
    // 年齢の入力
    const ageInput = prompt(`次に、あなたの年齢を入力してください (例: 18):`, "18");
    let playerAge = 18; // デフォルト年齢
    if (ageInput !== null) {
        const parsedAge = parseInt(ageInput, 10);
        if (!isNaN(parsedAge) && parsedAge >= 16 && parsedAge <= 60) { // 簡単なバリデーション
            playerAge = parsedAge;
        } else {
            alert("無効な年齢が入力されたか、範囲外です。デフォルトの18歳に設定します。");
        }
    } else {
        alert("年齢の入力がキャンセルされました。デフォルトの18歳に設定します。");
    }

    chosenPlayerInfo.age = playerAge; // プレイヤーの年齢を設定

    alert(`ようこそ、${careerPlayerName.firstName} ${careerPlayerName.lastName} (${formattedDisplayName}) さん (年齢: ${chosenPlayerInfo.age}歳)！\n次に契約するチームを選択してください。`);
    console.log("Career mode: Name entered - ", careerPlayerName, "Display name:", formattedDisplayName, "Age:", chosenPlayerInfo.age);
    chosenPlayerInfo.driverName = formattedDisplayName; // プレイヤーの表示名を chosenPlayerInfo にも設定
    chosenPlayerInfo.fullName = careerPlayerName.firstName + " " + careerPlayerName.lastName; // フルネームも設定
    // chosenPlayerInfo の他の情報はチーム選択後に設定される
    gameState = 'career_team_selection'; // チーム選択画面へ
}

function drawCareerTeamSelectionScreen() {
    ctx.save();
    // 背景
    ctx.fillStyle = 'rgba(20, 20, 20, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    const displayTitleName = formatPlayerDisplayName(careerPlayerName.firstName, careerPlayerName.lastName);
    ctx.fillText(`CHOOSE YOUR STARTING TEAM, ${displayTitleName}`, canvas.width / 2, 60);

    // 選択可能なチームの描画
    const itemHeight = 50; // ボタンの高さ
    const itemPadding = 20; // ボタン間の余白
    const buttonWidth = 300;
    const startY = 120; // タイトルの下から開始

    careerModeAvailableTeams.forEach((teamName, index) => {
        const buttonX = canvas.width / 2 - buttonWidth / 2;
        const buttonY = startY + index * (itemHeight + itemPadding);

        ctx.fillStyle = 'rgba(0, 100, 200, 0.8)'; // ボタンの色
        ctx.fillRect(buttonX, buttonY, buttonWidth, itemHeight);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 22px Arial';
        // チーム選択肢のドライバー名もフォーマットを統一する（もし必要なら）
        // ここでは既存の driverLineups の名前をそのまま使う
        const teamDrivers = driverLineups[teamName] ? driverLineups[teamName].drivers : [];
        let teamDisplayString = teamName;
        if (teamDrivers.length >= 2) {
            teamDisplayString = `${teamDrivers[0].name.split('.')[0]} / ${teamDrivers[1].name.split('.')[0]} (${teamName})`;
        } else if (teamDrivers.length === 1) {
            teamDisplayString = `${teamDrivers[0].name.split('.')[0]} / - (${teamName})`;
        }
        ctx.fillText(teamDisplayString, canvas.width / 2, buttonY + itemHeight / 2 + 8);
    });
    ctx.restore();
}

function drawCareerRosterScreen() {
    ctx.save();
    // 背景
    ctx.fillStyle = 'rgba(25, 25, 25, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center'; // 中央揃え
    ctx.fillText(`SEASON ${currentSeasonNumber} - DRIVER ROSTER`, canvas.width / 2, 60);

    // ドライバーリストの描画設定
    const listStartY = 120;
    const lineHeight = 22;
    const columnPadding = 30; // 列間のパディング
    const firstColumnX = 50;
    const secondColumnX = canvas.width / 2 + columnPadding / 2;
    const driversPerColumn = Math.ceil(NUM_CARS / 2);

    ctx.font = '18px "Formula1 Display Regular", Arial, sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const isPlayer = (i === playerCarIndex);
        const rank = car.startingGridRank; // グリッド順位を使用 (cars配列はグリッド順にソートされている想定)

        const ratingDisplay = isPlayer ? "N/A" : car.rating;
        const driverText = `${rank}. ${car.fullName} (${car.teamName || 'N/A'}) - Age: ${car.age} - Rating: ${ratingDisplay}`;

        let x, y;
        if (i < driversPerColumn) { // 1列目
            x = firstColumnX;
            y = listStartY + i * lineHeight;
        } else { // 2列目
            x = secondColumnX;
            y = listStartY + (i - driversPerColumn) * lineHeight;
        }

        ctx.fillStyle = isPlayer ? 'yellow' : 'white';
        ctx.fillText(driverText, x, y);
    }

    // 「NEXT」(シーズン開始)ボタンの準備と表示
    careerStartSeasonButton.isVisible = true;
    careerStartSeasonButton.x = canvas.width / 2 - careerStartSeasonButton.width / 2;
    careerStartSeasonButton.y = canvas.height - careerStartSeasonButton.height - 30;

    generalSaveButton.isVisible = true;
    generalSaveButton.x = canvas.width - generalSaveButton.width - 20; // 右上に配置
    generalSaveButton.y = 20;

    // 「NEXT」ボタンの描画
    // careerStartSeasonButton.isVisible はこの関数の冒頭で true に設定されているため、
    // ここで直接描画します。
    ctx.fillStyle = 'rgba(0, 150, 50, 0.9)'; // 緑系のボタン
    ctx.fillRect(careerStartSeasonButton.x, careerStartSeasonButton.y, careerStartSeasonButton.width, careerStartSeasonButton.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(careerStartSeasonButton.text, careerStartSeasonButton.x + careerStartSeasonButton.width / 2, careerStartSeasonButton.y + careerStartSeasonButton.height / 2 + 7);
    ctx.textAlign = 'left'; // textAlignをリセット

    // 汎用セーブボタンの描画 (この画面は早期リターンするため、ここで描画)
    if (generalSaveButton.isVisible) {
        ctx.fillStyle = 'rgba(0, 180, 100, 0.8)';
        ctx.fillRect(generalSaveButton.x, generalSaveButton.y, generalSaveButton.width, generalSaveButton.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial'; // フォントを再設定
        ctx.textAlign = 'center';     // ボタンテキスト用に中央揃え
        ctx.fillText(generalSaveButton.text, generalSaveButton.x + generalSaveButton.width / 2, generalSaveButton.y + generalSaveButton.height / 2 + 6);
    }
    ctx.textAlign = 'left'; // textAlignをリセット

    ctx.restore();
}

// Helper function to get parameters for drawing a scrollbar
function getScrollbarRenderParams(contentTotalHeight, scrollableAreaY, scrollableAreaHeight, currentScrollY) {
    const maxScroll = Math.max(0, contentTotalHeight - scrollableAreaHeight);
    let thumbHeight = 0;
    let thumbY = scrollableAreaY;

    if (maxScroll > 0 && scrollableAreaHeight > 0 && contentTotalHeight > 0) {
        thumbHeight = Math.max(SCROLLBAR_MIN_THUMB_HEIGHT, scrollableAreaHeight * (scrollableAreaHeight / contentTotalHeight));
        thumbHeight = Math.min(thumbHeight, scrollableAreaHeight); // Thumb cannot be taller than track
        const scrollableRatio = currentScrollY / maxScroll;
        thumbY = scrollableAreaY + scrollableRatio * (scrollableAreaHeight - thumbHeight);
    } else if (scrollableAreaHeight > 0) { // No scrolling needed, thumb is full height
        thumbHeight = scrollableAreaHeight;
        thumbY = scrollableAreaY;
    }

    return {
        x: canvas.width - SCROLLBAR_WIDTH - SCROLLBAR_PADDING,
        trackY: scrollableAreaY,
        trackHeight: scrollableAreaHeight,
        thumbY: thumbY,
        thumbHeight: thumbHeight,
        currentScroll: currentScrollY,
        maxScroll: maxScroll,
        contentTotalHeight: contentTotalHeight
    };
}

function drawCareerSeasonEndScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let titleText;
    let buttonText;

    if (currentRaceInSeason < RACES_PER_SEASON) { // レース終了時
        titleText = `DRIVER STANDINGS - RACE ${currentRaceInSeason}/${RACES_PER_SEASON} (S${currentSeasonNumber})`;
        buttonText = "View Team Standings";
    } else { // シーズン終了時
        titleText = `FINAL DRIVER STANDINGS - SEASON ${currentSeasonNumber}`;
        buttonText = "View Final Team Standings";
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px "Formula1 Display Wide", "Arial Black", sans-serif'; // 少しフォントサイズ調整
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 60);

    // --- 全ドライバーのリストを作成し、ポイントを割り当てる ---
    let allDriversData = [];
    if (currentRaceInSeason < RACES_PER_SEASON) { // レース終了時
        // cars 配列 (レース終了時のメンバー) を基準にする
        // cars 配列は initializeCars でグリッド順にソートされているが、
        // レース結果表示ではポイント順にソートするので、ここでは元の cars 配列を使う
        cars.forEach(car => { // initializeCars 直後の cars 配列を参照すべき
            const points = careerDriverSeasonPoints[car.driverName] || 0;
            allDriversData.push({
                shortName: car.driverName, // ポイントオブジェクトのキー照合用
                fullName: car.fullName,   // 表示用フルネーム
                points: points,
                isPlayer: (car.driverName === chosenPlayerInfo.driverName) // プレイヤー判定
            });
        });
    } else { // シーズン終了時
        // driverLineups からAIドライバーの情報を収集 (移籍が反映されている可能性)
        for (const teamName in driverLineups) {
            const team = driverLineups[teamName];
            team.drivers.forEach((driver) => {
                // プレイヤーの情報は別途 chosenPlayerInfo から取得するため、
                // ここでプレイヤー自身 (chosenPlayerInfo.driverName と一致し、プレイヤーの現チームにいるドライバー) はスキップする。
                if (teamName === careerPlayerTeamName && driver.name === chosenPlayerInfo.driverName) {
                    return; // プレイヤー自身なのでスキップ
                }
                const points = careerDriverSeasonPoints[driver.name] || 0;
                allDriversData.push({
                    shortName: driver.name,
                    fullName: driver.fullName,
                    points: points,
                    isPlayer: false // このループではAIドライバーのみを対象とする
                });
            });
        }
        // プレイヤー自身の情報を chosenPlayerInfo から取得して追加
        const playerPoints = careerDriverSeasonPoints[chosenPlayerInfo.driverName] || 0;
        allDriversData.push({
            shortName: chosenPlayerInfo.driverName,
            fullName: chosenPlayerInfo.fullName, // chosenPlayerInfo には fullName が設定されている想定
            points: playerPoints,
            isPlayer: true // プレイヤーなのでtrue
        });
    }
    // ポイントに基づいてドライバーをソート (降順)
    allDriversData.sort((a, b) => b.points - a.points);

    // スクロール可能なリスト表示領域の定義
    const lineHeight = 25;
    const listDisplayStartY = 120; // リストが画面上に表示され始めるY座標
    const listDisplayEndY = canvas.height - 120; // リストが画面上に表示され終わるY座標 (ボタンの上まで)
    const numDrivers = allDriversData.length; // スクロール範囲計算用に更新

    // 表示列のX座標設定
    const rankX = canvas.width / 2 - 180; // 順位のX座標
    const nameX = canvas.width / 2 - 150; // 名前のX座標
    const pointsX = canvas.width / 2 + 150; // ポイントのX座標

    ctx.font = 'bold 20px Arial';
    // ctx.textAlign = 'center'; // 個別に設定するためコメントアウト

    allDriversData.forEach((driverData, index) => {
        const rank = index + 1;
        let displayName = driverData.fullName; // 表示はフルネーム

        // 各リスト項目の絶対的なY座標 (スクロールがない場合のY座標)
        const itemAbsoluteY = listDisplayStartY + index * lineHeight;
        // スクロールを考慮した画面上のY座標
        const itemScrolledY = itemAbsoluteY - careerSeasonEndScrollY;

        // フルネームを取得
        // 項目が描画範囲内にある場合のみフルネーム検索と描画を行う
        if (itemScrolledY >= listDisplayStartY - lineHeight && itemScrolledY < listDisplayEndY + lineHeight) {
            // displayName は既に driverData.fullName で設定済み

            if (driverData.isPlayer) { // プレイヤーの成績を強調
                ctx.fillStyle = 'yellow';
            } else {
                ctx.fillStyle = 'white';
            }

            // 順位
            ctx.textAlign = 'right';
            ctx.fillText(`${rank}.`, rankX, itemScrolledY);

            // 名前
            ctx.textAlign = 'left';
            ctx.fillText(displayName, nameX, itemScrolledY);

            // ポイント
            ctx.textAlign = 'right';
            ctx.fillText(`${driverData.points} pts`, pointsX, itemScrolledY);
        }
    });

    // アクションボタン (Next Race / View Team Offers)
    const actionButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height - 100,
        width: 300,
        height: 50,
        text: buttonText
    };

    ctx.fillStyle = 'rgba(0, 100, 200, 0.8)';
    ctx.fillRect(actionButton.x, actionButton.y, actionButton.width, actionButton.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(actionButton.text, actionButton.x + actionButton.width / 2, actionButton.y + actionButton.height / 2 + 8);

    // Draw Scrollbar
    const scrollableAreaY = listDisplayStartY;
    const scrollableAreaHeight = listDisplayEndY - listDisplayStartY;
    const contentTotalHeight = allDriversData.length * lineHeight;

    const scrollParams = getScrollbarRenderParams(contentTotalHeight, scrollableAreaY, scrollableAreaHeight, careerSeasonEndScrollY);
    if (scrollParams.maxScroll > 0) {
        drawScrollbar(ctx, scrollParams.x, scrollParams.trackY, scrollParams.trackHeight, scrollParams.thumbY, scrollParams.thumbHeight);
    }





    // generalSaveButton.isVisible はここでは設定しない (デフォルトでfalseのまま)
    // generalSaveButton.x, generalSaveButton.y も設定不要
    // 描画もメインのdraw関数に任せるか、ここでは行わない (isVisibleがfalseなので描画されない)

    ctx.textAlign = 'left'; //念のためtextAlignをリセット
    ctx.restore();
}

function drawCareerTeamStandingsScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let titleText;
    let buttonText;

    if (currentRaceInSeason < RACES_PER_SEASON) { // レース終了時
        titleText = `TEAM STANDINGS - RACE ${currentRaceInSeason}/${RACES_PER_SEASON} (S${currentSeasonNumber})`;
        buttonText = "Next Race";
    } else { // シーズン終了時
        titleText = `FINAL TEAM STANDINGS - SEASON ${currentSeasonNumber}`;
        buttonText = "View Team Offers";
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 60);

    // スクロール可能なリスト表示領域の定義
    const listDisplayStartY = 120;
    const listDisplayEndY = canvas.height - 120;
    const teamLineHeight = 25;
    // 表示列のX座標設定 (ドライバーランキングと合わせるか、専用に調整)
    const teamRankX = canvas.width / 2 - 180;
    const teamNameX = canvas.width / 2 - 150;
    const teamPointsX = canvas.width / 2 + 150;

    // --- チームポイントの表示 ---
    const teamListHeaderY = listDisplayStartY; // チームリストは上から開始

    ctx.font = 'bold 24px "Formula1 Display Wide", Arial, sans-serif'; // チームランキングのタイトル (ヘッダーとして)
    ctx.fillStyle = 'white';
    // ctx.textAlign = 'center'; // 個別に設定するためコメントアウト
    // ヘッダーはスクロールしない固定表示とするか、リストの一部としてスクロールさせるか。ここではリストの一部とする。
    // const teamListHeaderScrolledY = teamListHeaderY - careerSeasonEndScrollY;
    // if (teamListHeaderScrolledY >= listDisplayStartY - teamLineHeight && teamListHeaderScrolledY < listDisplayEndY + teamLineHeight * 2) {
    //     ctx.fillText("TEAM STANDINGS", canvas.width / 2, teamListHeaderScrolledY);
    // }

    let teamStandings = [];
    for (const teamName in careerTeamSeasonPoints) {
        teamStandings.push({ name: teamName, points: careerTeamSeasonPoints[teamName] });
    }
    teamStandings.sort((a, b) => b.points - a.points); // ポイントで降順ソート

    ctx.font = 'bold 20px Arial'; // チームリストのフォント
    teamStandings.forEach((teamData, index) => {
        const rank = index + 1;
        // const text = `${rank}. ${teamData.name} - ${teamData.points} pts`;
        const itemAbsoluteY = teamListHeaderY + index * teamLineHeight; // ヘッダーの分下にずらす
        const itemScrolledY = itemAbsoluteY - careerSeasonEndScrollY;

        if (itemScrolledY >= listDisplayStartY - teamLineHeight && itemScrolledY < listDisplayEndY + teamLineHeight) {
            ctx.fillStyle = (teamData.name === careerPlayerTeamName) ? 'cyan' : 'white'; // プレイヤー所属チームをハイライト

            // 順位
            ctx.textAlign = 'right';
            ctx.fillText(`${rank}.`, teamRankX, itemScrolledY);

            // チーム名
            ctx.textAlign = 'left';
            ctx.fillText(teamData.name, teamNameX, itemScrolledY);

            // ポイント
            ctx.textAlign = 'right';
            ctx.fillText(`${teamData.points} pts`, teamPointsX, itemScrolledY);
        }
    });

    // アクションボタン
    const actionButton = { x: canvas.width / 2 - 150, y: canvas.height - 100, width: 300, height: 50, text: buttonText };
    ctx.fillStyle = 'rgba(0, 100, 200, 0.8)';
    ctx.fillRect(actionButton.x, actionButton.y, actionButton.width, actionButton.height);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 22px Arial';
    ctx.fillText(actionButton.text, actionButton.x + actionButton.width / 2, actionButton.y + actionButton.height / 2 + 8);
    ctx.restore();

    // Draw Scrollbar for Team Standings
    const scrollableAreaY_teams = listDisplayStartY; // Same as driver standings for Y start
    const scrollableAreaHeight_teams = listDisplayEndY - listDisplayStartY; // Same visible height
    const contentTotalHeight_teams = teamStandings.length * teamLineHeight;
    const scrollParamsTeams = getScrollbarRenderParams(contentTotalHeight_teams, scrollableAreaY_teams, scrollableAreaHeight_teams, careerSeasonEndScrollY);
    if (scrollParamsTeams.maxScroll > 0) {
        drawScrollbar(ctx, scrollParamsTeams.x, scrollParamsTeams.trackY, scrollParamsTeams.trackHeight, scrollParamsTeams.thumbY, scrollParamsTeams.thumbHeight);
    }
    // generalSaveButton.isVisible はここでは設定しない (デフォルトでfalseのまま)
    // generalSaveButton.x, generalSaveButton.y も設定不要
    // 描画もメインのdraw関数に任せるか、ここでは行わない (isVisibleがfalseなので描画されない)

    // ctx.textAlign = 'left'; // ctx.restore() で戻るので不要な場合が多い
}


function drawCareerMachinePerformanceScreen() {
    ctx.save();
    // 背景
    ctx.fillStyle = 'rgba(22, 22, 22, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MACHINE PERFORMANCE - SEASON ${currentSeasonNumber}`, canvas.width / 2, 60);

    // グラフ描画エリア設定
    ctx.save(); // グラフ描画エリアのクリッピングのために保存

    // === リスト表示とクリッピング領域の調整 ===
    const listStartX = 50; // チーム名とバーを含むリスト全体の開始X座標
    const teamNameDisplayWidth = 110; // チーム名表示のための幅
    const spaceAfterTeamName = 10; // チーム名とバーの間のスペース
    const barChartRenderStartX = listStartX + teamNameDisplayWidth + spaceAfterTeamName; // バーが実際に描画開始されるX座標

    const graphAreaY = 120;
    const barChartRenderWidth = canvas.width - barChartRenderStartX - listStartX; // バー描画に使用できる幅 (左右マージンを考慮)
    const graphAreaHeight = canvas.height - graphAreaY - 70; // 下部ボタンマージン (100 -> 70)

    // let teams = Object.keys(driverLineups); // 元の取得方法
    let teamsToDisplay;
    if (Object.keys(previousSeasonPointsForDisplay).length > 0) {
        // previousSeasonPointsForDisplay にデータがある場合 (通常はシーズン2以降)
        // このデータは前シーズンの最終チームポイントのはず
        teamsToDisplay = Object.keys(driverLineups).sort((a, b) => {
            const pointsA = previousSeasonPointsForDisplay[a] || 0;
            const pointsB = previousSeasonPointsForDisplay[b] || 0;
            if (pointsB !== pointsA) {
                return pointsB - pointsA; // 1. 前シーズンのポイント降順
            }
            // ポイントが同じ場合はティアでソート (ティア昇順)
            const tierA = driverLineups[a] ? driverLineups[a].tier : 99;
            const tierB = driverLineups[b] ? driverLineups[b].tier : 99;
            return tierA - tierB;
        });
        console.log("Machine Performance: Sorted by previous season team points using previousSeasonPointsForDisplay.");
    } else {
        // previousSeasonPointsForDisplay が空の場合 (例: シーズン1)
        // 現在のチームティアに基づいてソート (ティア昇順、ティアが同じならチーム名昇順)
        teamsToDisplay = Object.keys(driverLineups).sort((a, b) => {
            const tierA = driverLineups[a] ? driverLineups[a].tier : 99;
            const tierB = driverLineups[b] ? driverLineups[b].tier : 99;
            if (tierA !== tierB) return tierA - tierB;
            return a.localeCompare(b);
        });
        console.log("Machine Performance: Sorted by current team tier (as previousSeasonPointsForDisplay is empty).");
    }

    // グラフ描画エリアでクリッピング
    ctx.beginPath();
    ctx.rect(listStartX, graphAreaY, canvas.width - 2 * listStartX, graphAreaHeight); // クリップ領域を調整
    ctx.clip();
    const numTeams = teamsToDisplay.length;
    const barHeight = 18; // 各性能の棒の高さ
    const barGap = 4;    // 加速力と最高速の棒の間のギャップ
    const teamGap = 12;  // チーム間のギャップ (少し詰める)
    const totalTeamBlockHeight = barHeight * 2 + barGap + teamGap;
    // グラフのX軸スケール
    const minValue = 0.8; // 性能値の最小表示範囲
    const maxValue = 1.2; // 性能値の最大表示範囲
    const valueRange = maxValue - minValue;

    // 基準線 (1.0)
    const baselineX = barChartRenderStartX + ( (1.0 - minValue) / valueRange ) * barChartRenderWidth;
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 1;
    // 基準線はクリッピング範囲外にも描画したい場合があるため、クリッピング前に描画するか、クリッピング後に別途描画する
    ctx.beginPath();
    ctx.moveTo(baselineX, graphAreaY); // グラフエリアの上端から
    ctx.lineTo(baselineX, graphAreaY + graphAreaHeight); // グラフエリアの下端まで
    ctx.stroke();
    ctx.fillStyle = 'white'; // 基準値のテキストは白に
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("1.0", baselineX, graphAreaY - 15);

    teamsToDisplay.forEach((teamName, index) => {
        const teamData = driverLineups[teamName];
        const teamY = graphAreaY + index * totalTeamBlockHeight - careerMachinePerformanceScrollY;

        // チーム名の描画 (バーの左側、クリップ領域内)
        ctx.fillStyle = (teamName === careerPlayerTeamName) ? 'yellow' : 'white';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(teamName, listStartX + 5, teamY + barHeight + barGap / 2 + 2);

        const drawBar = (value, yOffset, color, label) => {
            const factor = Math.max(minValue, Math.min(maxValue, value || 1.0)); // 範囲内に収める
            // バーの幅は barChartRenderWidth を基準に計算
            const barW = ((factor - minValue) / valueRange) * barChartRenderWidth;
            ctx.fillStyle = color;
            // バーの描画開始X座標は barChartRenderStartX
            ctx.fillRect(barChartRenderStartX, teamY + yOffset, Math.max(0, barW), barHeight);
            ctx.fillStyle = 'white';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left'; // 数値は棒の右に左寄せ
            ctx.fillText((value || 1.0).toFixed(3), barChartRenderStartX + Math.max(0, barW) + 5, teamY + yOffset + barHeight / 2 + 4);
        };
        drawBar(teamData.accelerationFactor, 0, 'rgba(100, 100, 255, 0.8)', "Accel");
        drawBar(teamData.maxSpeedFactor, barHeight + barGap, 'rgba(255, 100, 100, 0.8)', "Speed");
    });

    ctx.restore(); // クリッピングを解除

    // === ボタンの描画 ===
    // セーブボタン
    generalSaveButton.isVisible = true;
    generalSaveButton.x = canvas.width - generalSaveButton.width - 20;
    generalSaveButton.y = 20;
    // セーブボタンの描画ロジックは draw 関数から移動させる

    // === 凡例の描画 (右下) ===
    const legendX = canvas.width - 180; // 右からのマージン
    const legendY = canvas.height - 80; // 下からのマージンを少し増やす
    const legendItemHeight = 25; // 凡例アイテムの高さを少し増やす
    const legendSquareSize = 15;
    const legendTextOffsetX = 20;

    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';

    // 加速力
    ctx.fillStyle = 'rgba(100, 100, 255, 0.8)';
    ctx.fillRect(legendX, legendY, legendSquareSize, legendSquareSize);
    ctx.fillStyle = 'white';
    ctx.fillText("Acceleration", legendX + legendTextOffsetX, legendY + legendSquareSize / 2 + 5);

    // 最高速
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.fillRect(legendX, legendY + legendItemHeight, legendSquareSize, legendSquareSize);
    ctx.fillStyle = 'white';
    ctx.fillText("Max Speed", legendX + legendTextOffsetX, legendY + legendItemHeight + legendSquareSize / 2 + 5);
    // === 凡例の描画ここまで ===

    // NEXTボタンの準備 (凡例の上、右下に配置)
    // isVisible はこの関数内で true に設定
    careerMachinePerformanceNextButton.isVisible = true;
    careerMachinePerformanceNextButton.width = 120; // サイズは既存のまま
    careerMachinePerformanceNextButton.height = 40;
    careerMachinePerformanceNextButton.x = legendX + (180 - legendTextOffsetX - legendSquareSize - careerMachinePerformanceNextButton.width) / 2; // 凡例エリアの右側に配置
    careerMachinePerformanceNextButton.y = legendY - careerMachinePerformanceNextButton.height - 15; // 凡例の少し上

    // NEXTボタンの描画ロジックは draw 関数から移動させる
    ctx.fillStyle = 'rgba(0, 100, 200, 0.9)'; // 青系のボタン
    ctx.fillRect(careerMachinePerformanceNextButton.x, careerMachinePerformanceNextButton.y, careerMachinePerformanceNextButton.width, careerMachinePerformanceNextButton.height);
    ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText(careerMachinePerformanceNextButton.text, careerMachinePerformanceNextButton.x + careerMachinePerformanceNextButton.width / 2, careerMachinePerformanceNextButton.y + careerMachinePerformanceNextButton.height / 2 + 7);
    ctx.textAlign = 'left'; // textAlignをリセット

    // セーブボタンの描画
    ctx.fillStyle = 'rgba(0, 180, 100, 0.8)';
    ctx.fillRect(generalSaveButton.x, generalSaveButton.y, generalSaveButton.width, generalSaveButton.height);
    ctx.fillStyle = 'white'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(generalSaveButton.text, generalSaveButton.x + generalSaveButton.width / 2, generalSaveButton.y + generalSaveButton.height / 2 + 6);
    ctx.restore();

    // Draw Scrollbar for Machine Performance
    const scrollableAreaY_machine = graphAreaY;
    const scrollableAreaHeight_machine = graphAreaHeight; // Calculated earlier in this function
    const contentTotalHeight_machine = totalTeamBlockHeight * numTeams; // Calculated earlier
    const scrollParamsMachine = getScrollbarRenderParams(contentTotalHeight_machine, scrollableAreaY_machine, scrollableAreaHeight_machine, careerMachinePerformanceScrollY);
    if (scrollParamsMachine.maxScroll > 0) {
        drawScrollbar(ctx, scrollParamsMachine.x, scrollParamsMachine.trackY, scrollParamsMachine.trackHeight, scrollParamsMachine.thumbY, scrollParamsMachine.thumbHeight);
    }
}

// ====== チームオファー関連の関数 ======
function generateTeamOffers(playerRank, currentTeamTier, nextSeasonTeamTiers, playerDriverShortName, seasonPoints) { // Add playerDriverShortName and seasonPoints
    const offers = [];
    const allTeamNames = Object.keys(driverLineups);

    // シンプルなオファールール (例)
    // プレイヤーの順位と現在のティアに基づいてオファー対象のティアを決定
    let offerableTiers = [];

    // currentTeamTier はプレイヤーの「前シーズン」のチームのティア。
    // offerableTiers は、プレイヤーの成績と「前シーズン」のチームティアを考慮して決定します。
    // その後、実際にオファーを出すチームは、「新シーズン」のティアがこの offerableTiers に含まれるかでフィルタリングします。
    if (playerRank === 1) { // 優勝
        offerableTiers = [1, 2, Math.max(1, currentTeamTier -1), currentTeamTier];
    } else if (playerRank <= 3) { // トップ3
        offerableTiers = [Math.max(1, currentTeamTier -1), currentTeamTier, Math.min(5, currentTeamTier + 1), 2, 3];
    } else if (playerRank <= 10) { // トップ10
        offerableTiers = [currentTeamTier, Math.min(5, currentTeamTier + 1), 3, 4];
    } else if (playerRank <= 15) { // トップ15
        offerableTiers = [currentTeamTier, Math.min(5, currentTeamTier + 1), 4, 5];
    } else { // 16位以下
        offerableTiers = [currentTeamTier, Math.min(5, currentTeamTier + 1), 5];
    }
    // 重複を除去し、ティアの昇順にソート
    offerableTiers = [...new Set(offerableTiers)].sort((a,b) => a - b);
    console.log(`generateTeamOffers: PlayerRank=${playerRank}, PrevPlayerTeamTier=${currentTeamTier}. Offerable Tiers (based on prev season context): ${offerableTiers.join(', ')}`);

    // === NEW: プレイヤーが前シーズンに所属していたチームからのオファー判定 ===
    // キャリアモードであり、かつ前シーズンにチームに所属していた場合のみ判定
    if (careerPlayerTeamName && playerDriverShortName) {
        const playerPreviousTeamTier = currentTeamTier; // This is the tier of the player's *previous* team
        const playerPreviousSeasonPoints = seasonPoints[playerDriverShortName] || 0; // 引数 seasonPoints からプレイヤーのポイントを取得

        // AI放出判定に使用するポイント閾値を参照
        const performanceThresholdForRetention = POOR_PERFORMANCE_POINT_THRESHOLDS_BY_TIER[playerPreviousTeamTier] !== undefined ? POOR_PERFORMANCE_POINT_THRESHOLDS_BY_TIER[playerPreviousTeamTier] : DEFAULT_POOR_PERFORMANCE_THRESHOLD;

        // プレイヤーのポイントが、そのチームティアでの放出閾値以上であれば、チームは契約をオファーする
        if (playerPreviousSeasonPoints >= performanceThresholdForRetention) {
            if (!offers.includes(careerPlayerTeamName)) { // 既にオファーリストになければ追加
                offers.push(careerPlayerTeamName);
                console.log(`generateTeamOffers: Player (${playerDriverShortName}) achieved ${playerPreviousSeasonPoints} points (Threshold: ${performanceThresholdForRetention}) with ${careerPlayerTeamName} (Tier ${playerPreviousTeamTier}). ${careerPlayerTeamName} offers a contract.`);
            }
        }
    }

    allTeamNames.forEach(teamName => {
        // チームの「新シーズン」のティアを取得
        const teamNextSeasonTier = nextSeasonTeamTiers[teamName]; // 引数 nextSeasonTeamTiers を使用
        if (teamNextSeasonTier !== undefined && offerableTiers.includes(teamNextSeasonTier)) {
            offers.push(teamName);
            console.log(` > Team ${teamName} (Next Season Tier: ${teamNextSeasonTier}) matches offerable tiers. Added to offers.`);
        } else if (teamNextSeasonTier === undefined) {
            console.warn(` > Team ${teamName} has no defined next season tier in nextSeasonTeamTiers. Skipping for offer consideration.`);
        } else {
            // console.log(` > Team ${teamName} (Next Season Tier: ${teamNextSeasonTier}) does not match offerable tiers. Skipped.`);
        }
    });

    // オファーが多すぎる場合は絞る (例: 最大3チームまでランダムに)
    if (offers.length > 3) {
        shuffleArray(offers); // ランダムシャッフル
        console.log(`generateTeamOffers: Too many offers (${offers.length}), shuffling and slicing to 3.`);
        return offers.slice(0, 3);
    }
    // オファーがなく、成績も振るわない場合、プレイヤーの「前シーズン」のチームの「新シーズン」でのティアより
    // 「新シーズン」で1つ下のティアのチームから1つオファーを出す試み
    if (offers.length === 0 && playerRank > 10) {
        console.log(`generateTeamOffers: No offers and playerRank > 10. Attempting fallback offer.`);
        // careerPlayerTeamName は前シーズンのプレイヤーのチーム名
        const playerPreviousTeamActualNextSeasonTier = careerPlayerTeamName ? nextSeasonTeamTiers[careerPlayerTeamName] : null;

        if (playerPreviousTeamActualNextSeasonTier !== null) {
            const targetFallbackTierInNewSeason = Math.min(5, playerPreviousTeamActualNextSeasonTier + 1);
            console.log(`generateTeamOffers: Fallback - Player's previous team (${careerPlayerTeamName}) will be Tier ${playerPreviousTeamActualNextSeasonTier} next season. Looking for teams that will be Tier ${targetFallbackTierInNewSeason} next season.`);

            const lowerTierTeamsInNewSeason = allTeamNames.filter(tn => {
                const teamNextTier = nextSeasonTeamTiers[tn]; // 各チームの「新シーズン」のティア
                return teamNextTier === targetFallbackTierInNewSeason;
            });

            if (lowerTierTeamsInNewSeason.length > 0) {
                shuffleArray(lowerTierTeamsInNewSeason);
                offers.push(lowerTierTeamsInNewSeason[0]);
                console.log(`generateTeamOffers: Fallback offer generated for ${lowerTierTeamsInNewSeason[0]} (Next Season Tier: ${nextSeasonTeamTiers[lowerTierTeamsInNewSeason[0]]}).`);
            } else {
                console.log(`generateTeamOffers: Fallback - No teams found that will be Tier ${targetFallbackTierInNewSeason} next season.`);
            }
        } else {
            console.log(`generateTeamOffers: Fallback - Could not determine player's previous team's next season tier (careerPlayerTeamName: ${careerPlayerTeamName}).`);
        }
    }

    return [...new Set(offers)]; // 最終的に重複を除去
}

function drawCareerTeamOffersScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.98)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px "Formula1 Display Wide", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SEASON ${currentSeasonNumber} END - TEAM OFFERS (Rank: ${playerLastSeasonRank})`, canvas.width / 2, 60);
    
    const buttonHeight = 50;
    const buttonPadding = 15;
    const buttonWidth = 350;
    const startY = 120;

    if (offeredTeams.length > 0) {
        offeredTeams.forEach((teamName, index) => {
            const buttonX = canvas.width / 2 - buttonWidth / 2;
            const buttonY = startY + index * (buttonHeight + buttonPadding);
            // 来シーズンのTierを表示
            const teamTier = nextSeasonTiersForOfferDisplay[teamName] !== undefined ? nextSeasonTiersForOfferDisplay[teamName] : 'N/A';

            ctx.fillStyle = 'rgba(50, 150, 50, 0.8)'; // オファーボタンの色
            ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`${teamName} (Tier ${teamTier})`, canvas.width / 2, buttonY + buttonHeight / 2 + 7);
        });
    } else {
        ctx.fillStyle = 'orange';
        ctx.font = 'bold 24px Arial';
        ctx.fillText("No contract offers this season.", canvas.width / 2, canvas.height / 2);
        // TODO: ここに「キャリア終了」や「下位カテゴリへ」などの選択肢を出す
    }
    // generalSaveButton.isVisible はここでは設定しない (デフォルトでfalseのまま)
    // generalSaveButton.x, generalSaveButton.y も設定不要
    // 描画もメインのdraw関数に任せるか、ここでは行わない (isVisibleがfalseなので描画されない)

    ctx.textAlign = 'left'; //念のためtextAlignをリセット

    ctx.restore();
}

// Helper function to calculate next season's team tiers
function calculateNextSeasonTeamTiers(currentLineups, finishedSeasonPoints) {
    let nextSeasonTiers = {};
    let teamStandings = [];

    // Initialize nextSeasonTiers with current tiers from currentLineups
    // This ensures any team not in finishedSeasonPoints (e.g., 0 points) retains its current tier.
    for (const teamName in currentLineups) {
        nextSeasonTiers[teamName] = currentLineups[teamName].tier;
    }

    // Populate teamStandings from finishedSeasonPoints
    for (const teamName in finishedSeasonPoints) {
        // Ensure the team exists in currentLineups to avoid errors if finishedSeasonPoints has stale data
        if (currentLineups[teamName]) {
            teamStandings.push({ name: teamName, points: finishedSeasonPoints[teamName] });
        }
    }
    teamStandings.sort((a, b) => b.points - a.points); // Sort by points descending

    teamStandings.forEach((teamData, index) => {
        const rank = index + 1;
        let newTier;
        if (rank <= 2) {
            newTier = 1;
        } else if (rank <= 4) {
            newTier = 2;
        } else if (rank <= 6) {
            newTier = 3;
        } else if (rank <= 8) {
            newTier = 4;
        } else {
            newTier = 5;
        }
        nextSeasonTiers[teamData.name] = newTier; // Update with new tier
    });
    return nextSeasonTiers;
}

// ====== AIドライバー移籍処理関数 ======
function handleAiDriverTransfers(currentLineups, seasonPoints, playerChosenTeamName, playerDriverShortName, reservePool) {
    let workingLineups = JSON.parse(JSON.stringify(currentLineups)); // 作業用のディープコピー
    // === 前シーズンのチームランキングに基づいてティアを更新 ===
    console.log("--- Updating Team Tiers based on Last Season's Standings ---");
    let teamStandingsForTierUpdate = [];
    for (const teamName in seasonPoints) { // グローバル変数ではなく、引数 seasonPoints を使用
        teamStandingsForTierUpdate.push({ name: teamName, points: seasonPoints[teamName] });
    }
    teamStandingsForTierUpdate.sort((a, b) => b.points - a.points); // ポイントで降順ソート
    
    teamStandingsForTierUpdate.forEach((teamData, index) => {
        const rank = index + 1;
        let newTier;
        if (rank <= 2) {
            newTier = 1;
        } else if (rank <= 4) {
            newTier = 2;
        } else if (rank <= 6) {
            newTier = 3;
        } else if (rank <= 8) {
            newTier = 4;
        } else {
            newTier = 5;
        }

        if (workingLineups[teamData.name]) {
            const oldTier = workingLineups[teamData.name].tier;
            workingLineups[teamData.name].tier = newTier;
            console.log(`Team ${teamData.name} (Rank: ${rank}, Points: ${teamData.points}) tier changed from ${oldTier} to ${newTier}`);
        }
    });
    console.log("--- Team Tier Update Complete ---");
    
    // === NEW: Apply Machine Upgrades based on Last Season's Standings ===
    console.log("--- Applying Machine Upgrades ---");
    teamStandingsForTierUpdate.forEach((teamData, index) => {
        const teamName = teamData.name;
        const rank = index + 1; // 1-based rank

        if (workingLineups[teamName]) {
            let accelDelta = 0;
            let speedDelta = 0; 
            let upgradeType = "";

            if (rank <= 6) { // Small upgrade for 1st-6th
                upgradeType = "Small";
                accelDelta = (Math.random() * (0.03 - (-0.03))) + (-0.03); // -0.03 to +0.03 
                speedDelta = (Math.random() * (0.01 - (-0.01))) + (-0.01); // -0.01 to +0.01
            } else if (rank >= 7 && rank <= (NUM_CARS / 2) ) { // Large upgrade for 7th-10th (assuming 10 teams)
                upgradeType = "Large";
                accelDelta = (Math.random() * (0.07 - (-0.05))) + (-0.05); // -0.05 to +0.07
                speedDelta = (Math.random() * (0.02 - (-0.015))) + (-0.015); // -0.015 to +0.02
            }

            if (upgradeType) { 
                const oldAccelFactor = workingLineups[teamName].accelerationFactor || 1.0;
                const oldSpeedFactor = workingLineups[teamName].maxSpeedFactor || 1.0;

                workingLineups[teamName].accelerationFactor = parseFloat((oldAccelFactor + accelDelta).toFixed(4));
                workingLineups[teamName].maxSpeedFactor = parseFloat((oldSpeedFactor + speedDelta).toFixed(4));

                console.log(`Team ${teamName} (Rank: ${rank}) received ${upgradeType} upgrade.`);
                console.log(`  Accel Factor: ${oldAccelFactor.toFixed(4)} -> ${workingLineups[teamName].accelerationFactor.toFixed(4)} (Delta: ${accelDelta.toFixed(4)})`);
                console.log(`  Max Speed Factor: ${oldSpeedFactor.toFixed(4)} -> ${workingLineups[teamName].maxSpeedFactor.toFixed(4)} (Delta: ${speedDelta.toFixed(4)})`);
            }
        }
    });
    console.log("--- Machine Upgrades Applied ---");
    
    // === NEW: Apply Regulation Change every 5 seasons ===
    // currentSeasonNumber は新しいシーズンの番号なので、(currentSeasonNumber - 1) が前のシーズン
    if (currentSeasonNumber > 1 && (currentSeasonNumber - 1) % 5 === 0) {
        console.log(`--- Applying Regulation Change for start of Season ${currentSeasonNumber} (after Season ${currentSeasonNumber - 1} ended) ---`);

        if (teamStandingsForTierUpdate.length > 0) {
            const firstPlaceTeamNameLastSeason = teamStandingsForTierUpdate[0].name;
            console.log(`Last season's 1st place team: ${firstPlaceTeamNameLastSeason}`);    

            const preRegulationFactors = {};
            for (const teamName in workingLineups) {
                preRegulationFactors[teamName] = {
                    accel: workingLineups[teamName].accelerationFactor || 1.0,
                    speed: workingLineups[teamName].maxSpeedFactor || 1.0
                };
            }    

            const oldFirstPlaceAccel = preRegulationFactors[firstPlaceTeamNameLastSeason].accel;
            const oldFirstPlaceSpeed = preRegulationFactors[firstPlaceTeamNameLastSeason].speed;    

            console.log(`  ${firstPlaceTeamNameLastSeason} pre-regulation factors: Accel=${oldFirstPlaceAccel.toFixed(4)}, Speed=${oldFirstPlaceSpeed.toFixed(4)}`);

            // Reset 1st place team's factors
            if (workingLineups[firstPlaceTeamNameLastSeason]) {
                workingLineups[firstPlaceTeamNameLastSeason].accelerationFactor = 1.0;
                workingLineups[firstPlaceTeamNameLastSeason].maxSpeedFactor = 1.0;
                console.log(`  ${firstPlaceTeamNameLastSeason} factors reset to 1.0`);
            }    

            // Adjust other teams' factors
            for (const teamName in workingLineups) {
                if (teamName === firstPlaceTeamNameLastSeason) continue;
    
                const oldTeamAccel = preRegulationFactors[teamName].accel;
                const oldTeamSpeed = preRegulationFactors[teamName].speed;

                workingLineups[teamName].accelerationFactor = parseFloat((1.0 + (oldTeamAccel - oldFirstPlaceAccel)).toFixed(4));
                workingLineups[teamName].maxSpeedFactor = parseFloat((1.0 + (oldTeamSpeed - oldFirstPlaceSpeed)).toFixed(4));
                console.log(`  Team ${teamName}: Accel ${oldTeamAccel.toFixed(4)} -> ${workingLineups[teamName].accelerationFactor.toFixed(4)}, Speed ${oldTeamSpeed.toFixed(4)} -> ${workingLineups[teamName].maxSpeedFactor.toFixed(4)}`);
            }
        } else {    
            console.warn("Regulation change skipped: No team standings available.");
        }
        console.log("--- Regulation Change Applied ---");
    }
    
    // --- プレイヤーを移籍前のチームから削除 ---
    // workingLineups は前シーズンの状態なので、ここでプレイヤーの古い所属先から削除する
    let playerPreviousTeamNameForLog = null; // ログ出力用
    for (const teamNameInOldLineup in workingLineups) {
        const teamInOldLineup = workingLineups[teamNameInOldLineup];
        const playerIndexInOldTeam = teamInOldLineup.drivers.findIndex(d => d.name === playerDriverShortName);
        if (playerIndexInOldTeam !== -1) {
            playerPreviousTeamNameForLog = teamNameInOldLineup;
            teamInOldLineup.drivers.splice(playerIndexInOldTeam, 1);
            console.log(`TRANSFERS: Player ${playerDriverShortName} removed from their previous team roster: ${playerPreviousTeamNameForLog} in workingLineups.`);
            break; // プレイヤーは1チームにしかいないはず
        }
    }
    // --- プレイヤー削除ここまで ---
    // 1. 全ドライバーの情報をリスト化 (プレイヤー含むが移籍対象外としてマーク)
    //    playerDriverShortName は chosenPlayerInfo.driverName
    let allDriverData = [];
    // Add F1 AI drivers from the previous season's lineup
    for (const teamName in workingLineups) {
        workingLineups[teamName].drivers.forEach((driver, index) => {
            // If this driver from workingLineups IS the player, we'll handle the player separately.
            if (driver.name === playerDriverShortName) {
                return; // Player will be added specifically later with their new season info
            }
            allDriverData.push({
                name: driver.name,
                fullName: driver.fullName,
                rating: driver.rating,
                aggression: driver.aggression,
                age: driver.age,
                currentTeamName: teamName,
                currentTeamTier: workingLineups[teamName].tier,
                points: seasonPoints[driver.name] || 0,
                isPlayer: false, // All these are AI for now
                // newTeamName: teamName, // 初期値は現在のチーム (移籍先が決まるまで) -> This will be removed
                isReserveOrF2: false, // F1グリッド上のドライバー
            });
        });
    }

    // F2/リザーブドライバーをallDriverDataに追加 (移籍市場の候補として)
    // Skip adding any reserve driver if their name matches the player's name.
    reservePool.forEach(rd => {
        if (rd.name === playerDriverShortName) {
            return; // Player will be added specifically later
        }
        // Avoid adding duplicates if a reserve driver was somehow already in allDriverData
        // (e.g. if an F1 AI had the same name, though unlikely with current data structure)
        if (!allDriverData.some(d => d.name === rd.name)) {
            allDriverData.push({
                name: rd.name,
                fullName: rd.fullName,
                rating: rd.rating,
                aggression: rd.aggression,
                age: rd.age, // imageName は不要
                currentTeamName: null, // F1チームには所属していない
                currentTeamTier: rd.desiredTierMin, // 移籍市場での評価用ティア
                points: 0, // F1での前シーズンポイントは0
                isPlayer: false, // All these are AI for now
                // newTeamName: null,   // 初期状態では移籍先なし -> This will be removed
                isReserveOrF2: true, // 新しいフラグ
                desiredTierMin: rd.desiredTierMin,
                desiredTierMax: rd.desiredTierMax
            });
        }
    });

    // Now, explicitly add the player to allDriverData with their current stats and new team assignment.
    // currentLineups is the global driverLineups passed in, reflecting team structures like tier.
    const tierForPlayerNewTeam = currentLineups[playerChosenTeamName] ? currentLineups[playerChosenTeamName].tier : 5; // Default to tier 5 if team not found

    allDriverData.push({
        name: playerDriverShortName, // This is chosenPlayerInfo.driverName
        fullName: chosenPlayerInfo.fullName,
        rating: chosenPlayerInfo.rating,
        aggression: chosenPlayerInfo.aggression !== undefined ? chosenPlayerInfo.aggression : carDefaults.aggression,
        age: chosenPlayerInfo.age,
        currentTeamName: playerChosenTeamName, // Player's chosen team for the new season
        currentTeamTier: tierForPlayerNewTeam, // Tier of the player's new team
        points: seasonPoints[playerDriverShortName] || 0, // Player's points from the last season
        isPlayer: true, // Explicitly mark as the player
        isReserveOrF2: false, // Player is an F1 driver for the new season
    });
    // const POOR_PERFORMANCE_POINT_THRESHOLD = 10; // 固定値からTier依存に変更
    const RELEASE_PROBABILITY_POOR_PERFORMANCE = 0.5; // 成績不振で放出される確率 (0.7から0.5へ変更し、残留確率UP)
    const RELEASE_PROBABILITY_LOW_RATING = 0.25;      // 低レーティングで放出される確率 (0.4から0.25へ変更し、残留確率UP)
    const LOW_RATING_THRESHOLD = 72;                  // このレーティング以下は放出検討対象 (70から変更)
    const DEFAULT_POOR_PERFORMANCE_THRESHOLD = 10; // Tierに設定がない場合のデフォルト値
    const POOR_PERFORMANCE_POINT_THRESHOLDS_BY_TIER = {
        1: 22, // Tier 1 チームはより高いポイントを要求
        2: 15,
        3: 10,
        4: 3,
        5: 1   // Tier 5 は低いポイントでも許容
    };

    // 1. 成績不振または低レーティングのF1 AIドライバーを確率で放出
    console.log("--- Starting AI Driver Release Phase ---");
    allDriverData.forEach(driver => {
        if (!driver.isPlayer && !driver.isReserveOrF2 && driver.currentTeamName) { // F1 AIドライバーであること
            let releaseReason = null;
            let releaseProb = 0;

            const teamTier = driver.currentTeamTier;
            const performanceThreshold = POOR_PERFORMANCE_POINT_THRESHOLDS_BY_TIER[teamTier] !== undefined ? POOR_PERFORMANCE_POINT_THRESHOLDS_BY_TIER[teamTier] : DEFAULT_POOR_PERFORMANCE_THRESHOLD;

            if (driver.points <= performanceThreshold) {
                releaseReason = "poor performance";
                releaseProb = RELEASE_PROBABILITY_POOR_PERFORMANCE;
            } else if (driver.rating < LOW_RATING_THRESHOLD) {
                releaseReason = "low rating";
                releaseProb = RELEASE_PROBABILITY_LOW_RATING;
            }

            if (releaseReason && Math.random() < releaseProb) {
                console.log(`Driver ${driver.name} (Team: ${driver.currentTeamName}, Tier: ${teamTier}, Pts: ${driver.points}, Threshold: ${performanceThreshold}, Rating: ${driver.rating}) is released due to ${releaseReason}.`);
                // driver.newTeamName = null; // 未所属にする -> Driver is removed from workingLineups instead
                // workingLineups からも削除して、空きスロットとして明確にする
                const teamInWorkingLineups = workingLineups[driver.currentTeamName];
                if (teamInWorkingLineups) {
                    const driverIndexInTeam = teamInWorkingLineups.drivers.findIndex(d => d.name === driver.name);
                    if (driverIndexInTeam > -1) {
                        teamInWorkingLineups.drivers.splice(driverIndexInTeam, 1);
                        console.log(` > ${driver.name} removed from workingLineups[${driver.currentTeamName}].drivers`);
                    }
                }
            } else if (releaseReason) {
                console.log(`Driver ${driver.name} (Team: ${driver.currentTeamName}, Tier: ${teamTier}, Pts: ${driver.points}, Threshold: ${performanceThreshold}, Rating: ${driver.rating}) was considered for release due to ${releaseReason} but was kept.`);
            }
        }
    });
    console.log("--- End AI Driver Release Phase ---");

    // 2. 補充候補ドライバーの準備 (未所属F1 AI + F2/リザーブ)
    // Helper function to check if a driver is in any team in the provided lineups
    const isDriverInTeamLineups = (driverName, lineups) => {
        for (const teamN in lineups) {
            if (lineups[teamN].drivers.some(d => d.name === driverName)) {
                return true;
            }
        }
        return false;
    };
    console.log("--- Starting AI Driver Replacement Phase ---");
    let replacementCandidates = allDriverData.filter(d => !d.isPlayer && !isDriverInTeamLineups(d.name, workingLineups));

    replacementCandidates.sort((a, b) => { // レーティング高い順 > 年齢若い順
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.age - b.age;
    });
    console.log("Replacement candidates:", replacementCandidates.map(d => `${d.name} (R:${d.rating} A:${d.age} ${d.isReserveOrF2 ? 'F2/Res' : 'F1-Unassigned'})`));

    // 3. 空きスロットへの補充
    const teamNamesSortedByTier = Object.keys(workingLineups).sort((a,b) => workingLineups[a].tier - workingLineups[b].tier);

    teamNamesSortedByTier.forEach(teamName => {
        const teamInfoFromWorking = workingLineups[teamName]; // workingLineupsから現在のチーム状況（放出後）を取得
        let currentDriverNamesInTeam = teamInfoFromWorking.drivers.map(d => d.name);

        let slotsToFillInThisTeam = 0;
        if (teamName === playerChosenTeamName) {
            // プレイヤーチームの場合、プレイヤーが1スロットを占める
            const playerIsAlreadyCounted = currentDriverNamesInTeam.includes(playerDriverShortName);
            // Player is guaranteed a spot. We need to fill 1 AI slot if it's empty.
            slotsToFillInThisTeam = 1 - teamInfoFromWorking.drivers.filter(d => d.name !== playerDriverShortName).length;
            if (!playerIsAlreadyCounted) { // If player isn't in the list (e.g. team was cleared)
                // This case should be handled by ensuring player is always in their team first.
            }
        } else {
            slotsToFillInThisTeam = 2 - currentDriverNamesInTeam.length;
        }

        console.log(`Team ${teamName} (Tier ${teamInfoFromWorking.tier}) has ${currentDriverNamesInTeam.length} drivers (${currentDriverNamesInTeam.join(', ')}), needs to fill ${slotsToFillInThisTeam} slot(s).`);

        for (let i = 0; i < slotsToFillInThisTeam && replacementCandidates.length > 0; i++) {
            let chosenCandidate = null;
            let chosenCandidateIndex = -1;

            // 1. チームのティアに合うF2/リザーブ候補者を探す (レート上位1-5名からランダム選択)
            let tierMatchingF2Candidates = replacementCandidates.filter(candidate =>
                candidate.isReserveOrF2 &&
                teamInfoFromWorking.tier >= candidate.desiredTierMin &&
                teamInfoFromWorking.tier <= candidate.desiredTierMax
            );

            if (tierMatchingF2Candidates.length > 0) {
                const topNCount = Math.min(5, tierMatchingF2Candidates.length);
                const selectionPool = tierMatchingF2Candidates.slice(0, topNCount);
                const randomIndexInPool = Math.floor(Math.random() * selectionPool.length);
                chosenCandidate = selectionPool[randomIndexInPool];
                // chosenCandidate が replacementCandidates の中で何番目かを探す
                chosenCandidateIndex = replacementCandidates.findIndex(rc => rc.name === chosenCandidate.name);
                console.log(` > Team ${teamName} (Tier ${teamInfoFromWorking.tier}) considering F2/Reserve pool (Top ${topNCount} matching tier): ${selectionPool.map(c => `${c.name}[R${c.rating}]`).join(', ')}. Randomly selected: ${chosenCandidate.name}`);
            }

            // ティアに合うF2/リザーブが見つからなかった場合、
            // 放出されたF1 AIを次に検討する
            if (!chosenCandidate) { // ステップ1で候補が見つからなかった場合
                for (let j = 0; j < replacementCandidates.length; j++) {
                    const candidate = replacementCandidates[j];
                    if (!candidate.isReserveOrF2) { // 放出されたF1 AI
                        chosenCandidate = candidate;
                        chosenCandidateIndex = j;
                        console.log(` > Team ${teamName} (Tier ${teamInfoFromWorking.tier}) no suitable F2/Reserve found by new rule. Picking released F1 AI: ${chosenCandidate.name}`);
                        break;
                    }
                }
                // それでも見つからなければ、ティア条件を無視してF2/リザーブから選ぶ
                if(!chosenCandidate && replacementCandidates.length > 0){
                    chosenCandidate = replacementCandidates[0]; // ソート済みなので先頭がレーティング最上位
                    // replacementCandidates[0] がF2/Reserveか確認する方がより丁寧
                    // ただし、このフォールバックは「とにかく誰か」なので、先頭で問題ない可能性も
                    if (replacementCandidates[0].isReserveOrF2) {
                        console.log(` > Team ${teamName} (Tier ${teamInfoFromWorking.tier}) no F1 AI found. Picking top-rated F2/Reserve (ignoring tier): ${chosenCandidate.name}`);
                    } else {
                        // replacementCandidates[0] がF1 AIだった場合 (上のループで見逃した場合など、通常は考えにくい)
                        console.log(` > Team ${teamName} (Tier ${teamInfoFromWorking.tier}) as fallback, picking top-rated overall candidate: ${chosenCandidate.name}`);
                    }
                    chosenCandidateIndex = 0;
                }
            }
            // 絶対的な最終フォールバック: それでも候補がいなければ、replacementCandidates の先頭を選ぶ (元のロジックの名残)
            if (!chosenCandidate && replacementCandidates.length > 0) {
                chosenCandidate = replacementCandidates[0];
                chosenCandidateIndex = 0;
                console.log(` > Team ${teamName} (Tier ${teamInfoFromWorking.tier}) as an absolute final fallback, picking top overall candidate from remaining: ${chosenCandidate.name}`);
            }

            if (chosenCandidate) {
                console.log(` > Assigning ${chosenCandidate.name} (R:${chosenCandidate.rating}, ${chosenCandidate.isReserveOrF2 ? 'F2/Res' : 'F1-Unassigned'}) to team ${teamName}.`);
                // Add to workingLineups
                teamInfoFromWorking.drivers.push({
                    name: chosenCandidate.name,
                    fullName: chosenCandidate.fullName,
                    rating: chosenCandidate.rating,
                    aggression: chosenCandidate.aggression,
                    age: chosenCandidate.age
                });
                replacementCandidates.splice(chosenCandidateIndex, 1); // 候補リストから削除
            } else {
                console.log(` > No suitable candidate found for team ${teamName} for slot ${i+1}.`);
                break; // このチームの残りのスロットは埋められない
            }
        }
    });
    console.log("--- End AI Driver Replacement Phase ---");

    // 4. Player Placement Assurance & Final Lineup Construction
    // workingLineups is already being modified. Ensure player is correctly placed.
    const playerDriverInfo = allDriverData.find(d => d.isPlayer);
    if (playerDriverInfo) {
        const playerTeam = workingLineups[playerChosenTeamName];
        if (!playerTeam.drivers.some(d => d.name === playerDriverInfo.name)) {
            // Player is not in their designated team, add them.
            // If team is full with 2 AIs, one AI needs to be bumped.
            if (playerTeam.drivers.length >= 2) {
                // Bump the lowest rated AI or last added AI from player's team
                playerTeam.drivers.sort((a,b) => a.rating - b.rating); // Sort by rating ascending
                const bumpedAi = playerTeam.drivers.shift(); // Remove lowest rated
                console.log(` > Player ${playerDriverInfo.name} needs a slot in ${playerChosenTeamName}. Bumping AI ${bumpedAi.name}.`);
                // Add bumped AI back to a list of unassigned AIs if not already handled
                // For simplicity, we assume replacementCandidates can be used or a new list.
                // Here, we'll just log it. The unassigned check later should catch them.
            }
            playerTeam.drivers.push({
                name: playerDriverInfo.name, fullName: playerDriverInfo.fullName,
                rating: playerDriverInfo.rating, aggression: playerDriverInfo.aggression, age: playerDriverInfo.age
            });
        }
        // Ensure player's team has at most 1 AI
        let aiInPlayerTeam = playerTeam.drivers.filter(d => d.name !== playerDriverInfo.name);
        if (aiInPlayerTeam.length > 1) {
            aiInPlayerTeam.sort((a,b) => a.rating - b.rating); // Sort AI by rating ascending
            const excessAi = aiInPlayerTeam.shift(); // Remove the lowest rated AI beyond the first one
            playerTeam.drivers = playerTeam.drivers.filter(d => d.name !== excessAi.name);
            console.log(` > Player's team ${playerChosenTeamName} had too many AIs. Removed ${excessAi.name}.`);
            // Add excessAi back to potential reserves
        }
    } else {
        console.error("CRITICAL: Player driver data not found in allDriverData during final placement.");
    }

    let finalLineups = workingLineups;

    // Defensive filtering: Ensure allDriverData does not contain undefined or null entries.
    allDriverData = allDriverData.filter(driver => driver !== undefined && driver !== null);

    // 5. 人数調整フェーズ: 各チームが2人になるように (残りの未所属AIで埋める)
    // This phase might be redundant if the previous hiring phase was thorough,
    // but it's a good safeguard.
    console.log("--- Final Team Roster Adjustment ---");
    // Re-evaluate unassigned AIs based on the current state of finalLineups
    let stillUnassignedAIs = allDriverData.filter(d => {
        if (!d) {
            console.warn("Skipping undefined driver in allDriverData.filter (stillUnassignedAIs).");
            return false;
        }
        return !d.isPlayer && !isDriverInTeamLineups(d.name, finalLineups);
    });
    stillUnassignedAIs.sort((a, b) => b.rating - a.rating); // 高レーティング優先

    for (const teamName in finalLineups) {
        const team = finalLineups[teamName];
        // Player's team should have 1 AI slot, others 2 total slots.
        const targetDriverCount = (teamName === playerChosenTeamName && team.drivers.some(d => d.name === playerDriverShortName)) ? 2 : 2;
        let requiredSlots = targetDriverCount - team.drivers.length;

        for (let i = 0; i < requiredSlots && stillUnassignedAIs.length > 0; i++) {
            const fillerAi = stillUnassignedAIs.shift(); // 配列の先頭から取得して削除
            if (!team.drivers.some(d => d.name === fillerAi.name)) { // 重複追加を防ぐ
                team.drivers.push({
                    name: fillerAi.name, fullName: fillerAi.fullName,
                    rating: fillerAi.rating, aggression: fillerAi.aggression, age: fillerAi.age
                });
                console.log(`Assigned still unassigned AI ${fillerAi.name} (R:${fillerAi.rating}) to team ${teamName} to fill slot.`);
            } else {
                i--; // この候補は使えなかったので、次の候補のためにカウンタを戻す
            }
        }

        // 最終チェック
        if (team.drivers.length < targetDriverCount) {
            console.warn(`Team ${teamName} still has ${team.drivers.length} drivers after final adjustment (target ${targetDriverCount}). Drivers: ${team.drivers.map(d=>d.name).join(', ')}. Needs more robust filling if this occurs frequently.`);
        } else if (team.drivers.length > targetDriverCount) {
            console.error(`CRITICAL: Team ${teamName} has ${team.drivers.length} drivers! (target ${targetDriverCount}). Drivers: ${team.drivers.map(d=>d.name).join(', ')}. Logic error in assignment.`);
        }
    }

    // 6. グリッドに配置されなかったAIドライバーをリザーブプールに戻す/更新する
    console.log("--- Moving/Updating Unassigned AI Drivers in Reserve Pool ---");
    // Re-check unassigned AIs based on the final state of finalLineups
    const trulyUnassignedAIs = allDriverData.filter(driverData => {
        if (!driverData) {
            console.warn("Skipping undefined driverData in reserve pool update phase.");
            return false;
        }
        return !driverData.isPlayer && !isDriverInTeamLineups(driverData.name, finalLineups);
    });

    trulyUnassignedAIs.forEach(driverData => {
        // const wasF1DriverAtStartOfTransfer = !allDriverData.find(d => d.name === driverData.name)?.isReserveOrF2; // 移籍処理開始時点でF1ドライバーだったか
        // Check original status from allDriverData
        const originalDriverRecord = allDriverData.find(d => d.name === driverData.name);
        const wasF1DriverAtStartOfTransfer = originalDriverRecord ? !originalDriverRecord.isReserveOrF2 : false;

        if (wasF1DriverAtStartOfTransfer) {
            console.log(`Driver ${driverData.name} (Was F1, Rating: ${driverData.rating}, Age: ${driverData.age}) did not get a new F1 seat. Moving to reserves.`);
        } else {
            console.log(`Reserve/F2 Driver ${driverData.name} (Rating: ${driverData.rating}, Age: ${driverData.age}) did not get an F1 seat. Remaining in/moving to reserves.`);
        }

        const reserveDriverIndex = reserveAndF2Drivers.findIndex(reserve => reserve.name === driverData.name);
        if (reserveDriverIndex === -1) { // リザーブにまだいない場合 (元F1ドライバーなど)
            reserveAndF2Drivers.push({
                name: driverData.name,
                fullName: driverData.fullName,
                rating: driverData.rating,
                aggression: driverData.aggression,
                age: driverData.age,
                desiredTierMin: wasF1DriverAtStartOfTransfer && originalDriverRecord.currentTeamTier ? Math.max(3, originalDriverRecord.currentTeamTier) : (originalDriverRecord.desiredTierMin || 3),
                desiredTierMax: wasF1DriverAtStartOfTransfer && originalDriverRecord.currentTeamTier ? 5 : (originalDriverRecord.desiredTierMax || 5)
            });
            console.log(` > ${driverData.name} added to reserveAndF2Drivers.`);
        } else { // 既にリザーブにいる場合 (元々リザーブだったドライバーなど) は情報を更新
            reserveAndF2Drivers[reserveDriverIndex].rating = driverData.rating;
            reserveAndF2Drivers[reserveDriverIndex].age = driverData.age;
            reserveAndF2Drivers[reserveDriverIndex].aggression = driverData.aggression;
            console.log(` > ${driverData.name} already in reserves. Updated info (Rating, Age, Aggression).`);
        }
    });
    // リザーブプールもソートしておく
    reserveAndF2Drivers.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating; // レーティング降順
        return a.age - b.age; // 年齢昇順 (若い方が優先)
    });

    return finalLineups;
}

// ====== ドライバー成長・加齢処理関数 ======
function handleDriverDevelopmentAndAging() {
    const MAX_POTENTIAL_RATING = 100;
    const MIN_GROWTH_AGE = 18;
    const PEAK_AGE_START = 26;
    const PEAK_AGE_END = 30;
    const DECLINE_AGE_START = 40 // 衰退開始年齢を少し上げる
    const BASE_GROWTH_POINTS_PER_SEASON = 3.6; // 若手の最大成長目安を1.8倍 (2.0 * 1.8)
    const F1_GROWTH_BONUS_FACTOR = 1.2; // F1所属ドライバーの成長ボーナス係数 (例: 20%増)
    const RANDOM_GROWTH_VARIATION = 0.6; // ランダム変動幅を少し上げる

    const processDriver = (driver) => {
        let ratingChange = 0;
        let isF1Driver = false;
        // ドライバーがF1チームに所属しているか判定
        for (const teamName in driverLineups) {
            if (driverLineups[teamName].drivers.some(d => d.name === driver.name)) {
                isF1Driver = true;
                break;
            }
        }

        if (driver.rating >= MAX_POTENTIAL_RATING && driver.age < DECLINE_AGE_START) {
            ratingChange = 0; // 既に最大ポテンシャルなら成長しない（衰退期前）
        } else if (driver.age < PEAK_AGE_START) { // 若手
            // 年齢が若いほど、またレーティングが低いほど成長しやすい
            let potentialGain = BASE_GROWTH_POINTS_PER_SEASON *
                                ((PEAK_AGE_START - driver.age) / (PEAK_AGE_START - MIN_GROWTH_AGE)) *
                                (1 - Math.max(0, driver.rating - 60) / (MAX_POTENTIAL_RATING - 70)); // 60未満は成長しやすい
            potentialGain = Math.max(0.1, potentialGain); // 最低でも少しは成長する可能性
            ratingChange = potentialGain * (1 + (Math.random() - 0.5) * RANDOM_GROWTH_VARIATION);
            if (isF1Driver) {
                ratingChange *= F1_GROWTH_BONUS_FACTOR; // F1ドライバーなら成長ボーナス
            } else {
                // F2/リザーブの若手はF1ボーナスなし
                // ratingChange はそのまま
            }
        } else if (driver.age >= PEAK_AGE_START && driver.age <= PEAK_AGE_END) { // ピーク年齢
            ratingChange = (Math.random() - 0.4) * 1.0; // 微増または微減 (-0.4 to +0.6)
        } else if (driver.age > DECLINE_AGE_START) { // 衰退期
            ratingChange = -0.5 - (Math.random() * ((driver.age - DECLINE_AGE_START) * 0.2)); // 年齢と共に減少幅増加
        }

        if (isF1Driver && driver.age >= PEAK_AGE_START && driver.age <= PEAK_AGE_END) {
             ratingChange *= F1_GROWTH_BONUS_FACTOR; // ピーク年齢でもF1ドライバーなら成長ボーナスを適用
        }
        const oldRating = driver.rating;
        driver.rating = Math.max(50, Math.min(MAX_POTENTIAL_RATING, Math.round(driver.rating + ratingChange))); // 最低50, 最高99
        driver.age += 1;

        // console.log(`DEV: ${driver.fullName || driver.name} (Age: ${driver.age-1}->${driver.age}) Rating: ${oldRating}->${driver.rating} (Change: ${ratingChange.toFixed(2)})`);
    };

    // F1ドライバーの処理
    for (const teamName in driverLineups) {
        driverLineups[teamName].drivers.forEach(driver => {
            // プレイヤーがこのスロットにいる場合はスキップ (chosenPlayerInfoで別途処理)
            if (careerPlayerTeamName === teamName && chosenPlayerInfo.driverName === driver.name) {
                // ただし、プレイヤーの年齢だけはここで加算しておく
                // chosenPlayerInfo.age += 1; // chosenPlayerInfoでまとめて処理するので不要
            } else {
                processDriver(driver);
            }
        });
    }

    // F2/リザーブドライバーの処理
    reserveAndF2Drivers.forEach(driver => {
        processDriver(driver);
    });

    // プレイヤーの処理 (キャリアモード時)
    if (careerPlayerTeamName && chosenPlayerInfo.driverName) {
        // console.log(`Player ${chosenPlayerInfo.fullName} (Age: ${chosenPlayerInfo.age} Rating: ${chosenPlayerInfo.rating}) is being processed for development.`);
        processDriver(chosenPlayerInfo); // chosenPlayerInfo も同じ成長ロジックを適用
    }
}

// ====== セーブ・ロード関連関数 ======
function gatherSaveData(gameStateToStore) {
    // gameStateToStore: このセーブデータがロードされた時に復帰すべき gameState
    // この関数が呼ばれる時点で、関連するグローバル変数はセーブしたい状態になっている想定
    // (例: 'all_finished' からのセーブの場合、一時的に次のシーズンの状態にグローバル変数が変更されている)

    // playerLastSeasonRank と offeredTeams は、'career_machine_performance' (特に新シーズン開始時)
    // の状態ではリセットされているべきなので、ここで調整する。
    const isNewSeasonMachinePerformance = gameStateToStore === 'career_machine_performance' && currentRaceInSeason === 1;


    return {
        saveName: `S${currentSeasonNumber} R${currentRaceInSeason} - ${chosenPlayerInfo.driverName || 'Player'} - ${new Date().toLocaleDateString()}`,
        timestamp: Date.now(),
        version: "1.0",

        currentGameState: gameStateToStore,
        currentSeasonNumber: currentSeasonNumber,
        currentRaceInSeason: currentRaceInSeason,
        currentRaceType: JSON.parse(JSON.stringify(currentRaceType)),

        chosenPlayerInfo: JSON.parse(JSON.stringify(chosenPlayerInfo)),
        careerPlayerName: JSON.parse(JSON.stringify(careerPlayerName)),
        careerPlayerTeamName: careerPlayerTeamName,

        careerDriverSeasonPoints: JSON.parse(JSON.stringify(careerDriverSeasonPoints)),
        careerTeamSeasonPoints: JSON.parse(JSON.stringify(careerTeamSeasonPoints)),
        previousRaceFinishingOrder: JSON.parse(JSON.stringify(previousRaceFinishingOrder)),
        playerLastSeasonRank: isNewSeasonMachinePerformance ? 0 : playerLastSeasonRank,
        previousSeasonPointsForDisplay: JSON.parse(JSON.stringify(previousSeasonPointsForDisplay)), // 前シーズンのポイント情報をセーブ
        offeredTeams: isNewSeasonMachinePerformance ? [] : JSON.parse(JSON.stringify(offeredTeams)),
        playerCareerHistory: JSON.parse(JSON.stringify(playerCareerHistory)),

        driverLineups: JSON.parse(JSON.stringify(driverLineups)),
        reserveAndF2Drivers: JSON.parse(JSON.stringify(reserveAndF2Drivers)),

        ZOOM_LEVEL: ZOOM_LEVEL,

    };
}

function saveGameToSlot(slotIndex, gameData) {
    const allSavesRaw = localStorage.getItem(ALL_SAVES_KEY);
    let allSaves = [];
     if (allSavesRaw) {
        try {
            allSaves = JSON.parse(allSavesRaw);
            if (!Array.isArray(allSaves)) allSaves = [];
        } catch (e) {
            allSaves = [];
        }
    }
    // 配列の長さをMAX_SAVE_SLOTSに合わせる（不足していればnullで埋める）
    while(allSaves.length < MAX_SAVE_SLOTS) {
        allSaves.push(null);
    }
    allSaves[slotIndex] = gameData;
    try {
        localStorage.setItem(ALL_SAVES_KEY, JSON.stringify(allSaves.slice(0, MAX_SAVE_SLOTS)));
    } catch (e) {
        console.error("Error saving game to localStorage:", e);
        alert("セーブに失敗しました。ストレージの空き容量を確認してください。");
    }
}

function applyLoadedData(dataToLoad) {
    if (!dataToLoad || typeof dataToLoad !== 'object') {
        alert("ロードデータが無効です。");
        return { success: false, loadedGameState: null };
    }
    // バージョンチェック (将来的に)
    // if (dataToLoad.version !== "1.0") { alert("セーブデータのバージョンが異なります。"); return false; }

    // Do not set global gameState here. Use a local variable for internal logic.
    const internalLoadedGameState = dataToLoad.currentGameState || 'title_screen';

    currentSeasonNumber = dataToLoad.currentSeasonNumber || 1;
    currentRaceInSeason = dataToLoad.currentRaceInSeason || 1;
    currentRaceType = dataToLoad.currentRaceType ? JSON.parse(JSON.stringify(dataToLoad.currentRaceType)) : RACE_TYPES.SPRINT;

    chosenPlayerInfo = dataToLoad.chosenPlayerInfo ? JSON.parse(JSON.stringify(dataToLoad.chosenPlayerInfo)) : { driverName: null, imageName: null, teamName: null, fullName: null, rating: null, age: 18 };
    careerPlayerName = dataToLoad.careerPlayerName ? JSON.parse(JSON.stringify(dataToLoad.careerPlayerName)) : { firstName: "", lastName: "" };
    careerPlayerTeamName = dataToLoad.careerPlayerTeamName || null;

    careerDriverSeasonPoints = dataToLoad.careerDriverSeasonPoints ? JSON.parse(JSON.stringify(dataToLoad.careerDriverSeasonPoints)) : {};
    careerTeamSeasonPoints = dataToLoad.careerTeamSeasonPoints ? JSON.parse(JSON.stringify(dataToLoad.careerTeamSeasonPoints)) : {};
    previousRaceFinishingOrder = dataToLoad.previousRaceFinishingOrder ? JSON.parse(JSON.stringify(dataToLoad.previousRaceFinishingOrder)) : [];
    playerLastSeasonRank = dataToLoad.playerLastSeasonRank || 0;
    previousSeasonPointsForDisplay = dataToLoad.previousSeasonPointsForDisplay ? JSON.parse(JSON.stringify(dataToLoad.previousSeasonPointsForDisplay)) : {}; // ロード時に復元
    offeredTeams = dataToLoad.offeredTeams ? JSON.parse(JSON.stringify(dataToLoad.offeredTeams)) : [];
    playerCareerHistory = dataToLoad.playerCareerHistory ? JSON.parse(JSON.stringify(dataToLoad.playerCareerHistory)) : [];

    driverLineups = dataToLoad.driverLineups ? JSON.parse(JSON.stringify(dataToLoad.driverLineups)) : {}; // driverLineups のデフォルトは複雑なので、ロード失敗時は問題
    reserveAndF2Drivers = dataToLoad.reserveAndF2Drivers ? JSON.parse(JSON.stringify(dataToLoad.reserveAndF2Drivers)) : [];

    ZOOM_LEVEL = dataToLoad.ZOOM_LEVEL || 1.0;

    initializeRaceSettings(currentRaceInSeason);

    // ロード後の状態に応じて車の初期化を検討
    // playerCar を必要とする可能性のある状態を列挙
    const statesRequiringCarsInitialized = [
        'signal_sequence',
        'race',
        'finished',
        'all_finished',
        'replay', // リプレイも cars 配列の構造は使う
        'career_roster', // ロスター表示に cars 配列を使う
        // 'career_machine_performance' は直接 cars を使わないが、その後の遷移で必要になる場合がある
    ];

    if (statesRequiringCarsInitialized.includes(internalLoadedGameState)) {
        console.log("Calling initializeCars() after loading into state:", internalLoadedGameState);
        initializeCars(); // 重要なグローバル変数が復元された後に呼び出す
    } else if (internalLoadedGameState === 'career_machine_performance') {
        // マシンパフォーマンス画面自体は cars を直接使わないが、
        // この画面から次の画面（例：ロスター）に進む際に initializeCars が呼ばれる。
        // chosenPlayerInfo は直接ロードされるので、プレイヤー名表示は大丈夫。
        // チームのパフォーマンス表示も driverLineups からなので大丈夫。
        // ここで initializeCars() を呼ばなくても、次の画面遷移で初期化される想定。
    }

    // UIボタンの表示状態をリセット（各draw関数で再設定される）
    [quickRaceButton, careerModeButton, loadGameButton, generalSaveButton,
     careerNextButton, quickRaceBackButton, careerMachinePerformanceNextButton,
     careerStartSeasonButton, replayButton].forEach(btn => btn.isVisible = false);

    alert("ゲームをロードしました！");
    return { success: true, loadedGameState: internalLoadedGameState };
}

function loadGameFromSlot(slotIndex) {
    const allSavesRaw = localStorage.getItem(ALL_SAVES_KEY);
    if (allSavesRaw) {
        try {
            const allSaves = JSON.parse(allSavesRaw);
            if (Array.isArray(allSaves) && allSaves[slotIndex]) {
                return applyLoadedData(allSaves[slotIndex]);
            }
        } catch (e) {
            console.error("Error loading game from localStorage:", e);
        }
    }
    alert(`スロット ${slotIndex + 1} からのロードに失敗しました。`);
    return { success: false, loadedGameState: null };
}

function drawSaveLoadScreen(isSaveMode) {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px "Formula1 Display Wide", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSaveMode ? "ゲームをセーブ" : "ゲームをロード", canvas.width / 2, 60);

    // 戻るボタン
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.fillRect(backButton.x, backButton.y, backButton.width, backButton.height);
    ctx.fillStyle = 'white'; ctx.font = 'bold 18px Arial';
    ctx.fillText(backButton.text, backButton.x + backButton.width / 2, backButton.y + backButton.height / 2 + 6);

    // 「すべてのセーブデータを削除」ボタン (ロードモード時のみ)
    if (!isSaveMode) {
        deleteAllSavesButton.isVisible = true;
        deleteAllSavesButton.x = canvas.width - deleteAllSavesButton.width - 10; // 右上に配置
        deleteAllSavesButton.y = 10; // 上からのマージン

        ctx.fillStyle = 'rgba(200, 50, 50, 0.8)'; // 赤系のボタン
        ctx.fillRect(deleteAllSavesButton.x, deleteAllSavesButton.y, deleteAllSavesButton.width, deleteAllSavesButton.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial'; // フォントサイズ調整
        ctx.textAlign = 'center';
        ctx.fillText(deleteAllSavesButton.text, deleteAllSavesButton.x + deleteAllSavesButton.width / 2, deleteAllSavesButton.y + deleteAllSavesButton.height / 2 + 5);
    } else {
        deleteAllSavesButton.isVisible = false;
    }


    // スロット描画
    calculatedSlotWidth = (canvas.width - (SLOTS_PER_ROW + 1) * SLOT_MARGIN_X) / SLOTS_PER_ROW;
    // calculatedSlotHeight はグローバルで定義済み (80)

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        const slotData = saveSlotsMetadata[i];
        const col = i % SLOTS_PER_ROW;
        const row = Math.floor(i / SLOTS_PER_ROW);

        const slotX = SLOT_MARGIN_X + col * (calculatedSlotWidth + SLOT_MARGIN_X);
        const slotY = SLOT_START_Y_OFFSET + row * (calculatedSlotHeight + SLOT_MARGIN_Y);

        // マウスオーバーのハイライト
        if (currentMouseX >= slotX && currentMouseX <= slotX + calculatedSlotWidth &&
            currentMouseY >= slotY && currentMouseY <= slotY + calculatedSlotHeight) {
            ctx.fillStyle = 'rgba(80, 80, 80, 0.8)';
        } else {
            ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        }
        ctx.fillRect(slotX, slotY, calculatedSlotWidth, calculatedSlotHeight);
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.strokeRect(slotX, slotY, calculatedSlotWidth, calculatedSlotHeight);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const textYOffset = 10; // テキスト描画のYオフセット調整用

        if (slotData.isEmpty) {
            ctx.font = 'italic 18px Arial';
            ctx.fillText(`スロット ${i + 1}`, slotX + calculatedSlotWidth / 2, slotY + calculatedSlotHeight / 2 - textYOffset / 2);
            ctx.font = 'italic 16px Arial';
            ctx.fillText("(空)", slotX + calculatedSlotWidth / 2, slotY + calculatedSlotHeight / 2 + textYOffset * 1.5);
        } else {
            ctx.font = 'bold 16px Arial';
            // 名前が長すぎる場合は省略
            let displayName = slotData.name;
            if (ctx.measureText(displayName).width > calculatedSlotWidth - 10) {
                while(ctx.measureText(displayName + "...").width > calculatedSlotWidth - 10 && displayName.length > 5) {
                    displayName = displayName.slice(0, -1);
                }
                displayName += "...";
            }
            ctx.fillText(displayName, slotX + calculatedSlotWidth / 2, slotY + textYOffset + 10);
            ctx.font = '12px Arial';
            ctx.fillText(new Date(slotData.timestamp).toLocaleString(), slotX + calculatedSlotWidth / 2, slotY + calculatedSlotHeight - textYOffset - 5);
        }
    }
    ctx.restore();
}

// Generic scrollbar drawing function
function drawScrollbar(ctx, x, trackY, trackHeight, thumbActualY, thumbActualHeight) {
    // Draw Track
    ctx.fillStyle = SCROLLBAR_TRACK_COLOR;
    ctx.fillRect(x, trackY, SCROLLBAR_WIDTH, trackHeight);

    // Draw Thumb
    if (thumbActualHeight > 0 && thumbActualHeight <= trackHeight) { // Only draw thumb if it's valid
        ctx.fillStyle = SCROLLBAR_THUMB_COLOR;
        ctx.fillRect(x + 1, thumbActualY, SCROLLBAR_WIDTH - 2, thumbActualHeight); // Thumb slightly narrower for border effect
    }
}



// ====== ゲームループ ======
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
// 全ての画像がロードされてからゲームループを開始するため、直接呼び出しはしない
// 画像のonloadコールバックで gameLoop() が呼び出されます。
// もし画像が一つも指定されていない（空の配列の場合）は、すぐにゲームループを開始
if (imagesToLoad === 0 && !allImagesLoaded) { // !allImagesLoaded を追加して重複起動を防ぐ
    checkAllImagesLoadedAndStartGame(); // gameLoopはcheckAllImagesLoadedAndStartGameから呼ばれる
}
