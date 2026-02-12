#!/bin/bash
# notion-sync.sh - 簡化版 Notion → MkDocs 同步

echo "🔄 Notion → MkDocs 同步開始"

# 檢查環境
if [ -z "$NOTION_TOKEN" ]; then
    echo "⚠️  NOTION_TOKEN 未設置，嘗試從環境讀取..."
    # 嘗試從 .env 文件讀取
    if [ -f "$HOME/.openclaw/.env" ]; then
        export $(grep -v '^#' "$HOME/.openclaw/.env" | xargs)
    fi
fi

if [ -z "$NOTION_TOKEN" ]; then
    echo "❌ NOTION_TOKEN 未設置，無法同步"
    echo "請運行: export NOTION_TOKEN='你的token'"
    exit 1
fi

cd /home/chris/.openclaw/workspace-work

# 運行同步腳本
node notion-sync.js

if [ $? -eq 0 ]; then
    echo "✅ 同步成功，準備部署..."
    
    # 部署到 Vercel
    cd ab-research
    if [ -n "$VERCEL_TOKEN" ]; then
        vercel deploy --token "$VERCEL_TOKEN" --prod --yes
        echo "✅ 部署完成！"
        echo "🔗 https://ab-research.vercel.app"
    else
        echo "⚠️  VERCEL_TOKEN 未設置，請手動部署"
        echo "運行: cd ab-research && vercel --prod"
    fi
else
    echo "❌ 同步失敗"
    exit 1
fi
