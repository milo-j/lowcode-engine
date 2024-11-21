#!/usr/bin/env node
const os = require('os');
const del = require('del');
const gulp = require('gulp');
const execa = require('execa');

// 删除根目录的锁文件
async function deleteRootDirLockFile() {
    console.log('Deleting root lock files...');
    await del(['package-lock.json', 'yarn.lock']);
}

// 清理子包的 `node_modules`
async function clean() {
    console.log('Cleaning packages...');
    await execa.command('lerna clean -y', { stdio: 'inherit', encoding: 'utf-8' });
}

// 删除子包中的锁文件
async function deletePackagesDirLockFile() {
    console.log('Deleting package lock files in packages...');
    await del('packages/**/package-lock.json');
}

// 安装依赖并链接子包
async function installDependencies() {
    console.log('Installing dependencies...');
    const useYarn = await checkIfYarn();
    if (useYarn) {
        await execa.command('yarn install', { stdio: 'inherit', encoding: 'utf-8' });
    } else {
        await execa.command('npm install', { stdio: 'inherit', encoding: 'utf-8' });
    }
}

// 检查是否使用 Yarn
async function checkIfYarn() {
    try {
        await execa.command('yarn --version');
        return true;
    } catch (e) {
        return false;
    }
}

// 跨平台调用 setup 脚本或执行任务
async function executeSetup() {
    console.log('Setting up project...');
    if (os.type() === 'Windows_NT') {
        // 执行 gulp 任务链
        const setup = gulp.series(
            deleteRootDirLockFile,
            clean,
            deletePackagesDirLockFile,
            installDependencies
        );
        await setup();
    } else {
        // 调用 Linux/Mac 专用脚本
        await execa.command('bash scripts/setup.sh', { stdio: 'inherit', encoding: 'utf-8' });
    }
}

// 执行脚本
executeSetup().catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
});
