# -*- coding: utf-8 -*-
"""
Spider App 배포 스크립트
========================
이 스크립트를 실행하면:
1. _spider_staging/apps/spider/ 폴더를 lgsh-backend-analytics/lgsh/apps/spider/ 로 복사
2. config/urls.py 에 spider URL 패턴 추가
3. config/settings/base.py 에 apps.spider 추가

사용법:
    python deploy_spider.py
"""
import os
import shutil

STAGING = os.path.join(os.path.dirname(__file__), 'apps', 'spider')
TARGET_BASE = r'C:\LGSH_DEV_V2\lgsh-backend-analytics\lgsh'
TARGET_APP = os.path.join(TARGET_BASE, 'apps', 'spider')


def copy_app():
    """spider 앱 폴더 복사"""
    if os.path.exists(TARGET_APP):
        shutil.rmtree(TARGET_APP)
        print(f'  Removed existing: {TARGET_APP}')
    shutil.copytree(STAGING, TARGET_APP)
    print(f'  Copied: {STAGING} -> {TARGET_APP}')


def patch_urls():
    """config/urls.py 에 spider URL 추가"""
    urls_path = os.path.join(TARGET_BASE, 'config', 'urls.py')
    with open(urls_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "apps.spider.urls" in content:
        print('  config/urls.py: spider URL already present - skipped')
        return

    anchor = "path('api/v1/ts/', include('apps.timeseries.urls')),"
    if anchor in content:
        replacement = anchor + "\n\n    # 스파이더웹 분석 API\n    path('api/v1/spider/', include('apps.spider.urls')),"
        content = content.replace(anchor, replacement)
        with open(urls_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('  Patched: config/urls.py (added spider URL)')
    else:
        print('  WARNING: could not find timeseries anchor in config/urls.py - manual edit needed')


def patch_settings():
    """config/settings/base.py 에 apps.spider 추가"""
    settings_path = os.path.join(TARGET_BASE, 'config', 'settings', 'base.py')
    with open(settings_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "'apps.spider'" in content:
        print('  config/settings/base.py: apps.spider already present - skipped')
        return

    anchor = "'apps.timeseries',"
    if anchor in content:
        replacement = anchor + "\n    'apps.spider',"
        content = content.replace(anchor, replacement)
        with open(settings_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('  Patched: config/settings/base.py (added apps.spider to INSTALLED_APPS)')
    else:
        print('  WARNING: could not find timeseries anchor in config/settings/base.py - manual edit needed')


def main():
    print('Spider App Deployment')
    print('=' * 60)

    print('\n[1/3] Copying spider app files...')
    copy_app()

    print('\n[2/3] Patching config/urls.py...')
    patch_urls()

    print('\n[3/3] Patching config/settings/base.py...')
    patch_settings()

    print('\n' + '=' * 60)
    print('Deployment complete!')
    print(f'\nFiles deployed to: {TARGET_APP}')
    print('\nCreated files:')
    for root, dirs, files in os.walk(TARGET_APP):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), TARGET_BASE)
            print(f'  {rel}')


if __name__ == '__main__':
    main()
