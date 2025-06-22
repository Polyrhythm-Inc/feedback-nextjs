const { exec } = require('child_process');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// .env.productionファイルを読み込む
const envPath = path.resolve(__dirname, '../env.production');
if (!fs.existsSync(envPath)) {
    console.error('❌ env.production file not found');
    console.log('📁 Expected location:', envPath);
    process.exit(1);
}

console.log('📋 Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

// 環境変数をHerokuに設定するコマンドを生成
const envVars = dotenv.parse(fs.readFileSync(envPath));

// DATABASE_URLは除外（Herokuが自動設定）
delete envVars.DATABASE_URL;

console.log('🔧 Setting the following environment variables:');
Object.keys(envVars).forEach(key => {
    // シークレット情報は隠す
    const value = key.includes('SECRET') || key.includes('KEY')
        ? '*'.repeat(8)
        : envVars[key];
    console.log(`  ${key}=${value}`);
});

const setConfigCommand = Object.keys(envVars)
    .map((key) => `heroku config:set ${key}='${envVars[key]}'`)
    .join(' && ');

console.log('\n🚀 Executing Heroku config commands...');

// コマンドを実行して環境変数をHerokuに設定
exec(setConfigCommand, (err, stdout, stderr) => {
    if (err) {
        console.error(`❌ Error setting Heroku config vars: ${err}`);
        return;
    }
    if (stderr) {
        console.error(`⚠️  stderr: ${stderr}`);
    }
    console.log(`✅ stdout: ${stdout}`);
    console.log('\n🎉 Environment variables successfully set!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: git push heroku main');
    console.log('2. Run: heroku open');
}); 