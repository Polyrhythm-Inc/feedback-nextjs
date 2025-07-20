#!/bin/bash

# 現在のディレクトリ名を取得
DIRNAME=$(basename "$PWD")

# ディレクトリ名を数値に変換（簡易的なハッシュ）
# 文字列の各文字のASCII値を合計して、適切な範囲に収める
PORT_BASE=3000
PORT_RANGE=57000  # 3000-59999の範囲（60000未満）

# ディレクトリ名のハッシュ値を計算
hash_value=0
for (( i=0; i<${#DIRNAME}; i++ )); do
    char="${DIRNAME:$i:1}"
    ascii=$(printf '%d' "'$char")
    hash_value=$((hash_value + ascii * (i + 1)))
done

# ポート番号を計算（PORT_BASE + (hash_value % PORT_RANGE)）
PORT=$((PORT_BASE + (hash_value % PORT_RANGE)))

# ポート番号のみを標準出力
echo $PORT