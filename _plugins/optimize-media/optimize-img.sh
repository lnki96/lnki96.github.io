#!/bin/bash
#
# optimize-img.sh

if [[ $# -ne 3 && ($# -ne 4 || $3 != "--clean" ) ]]; then
    echo "Usage: $(basename $0) <input_dir> <quality> [--clean] <output_dir>"
    exit -1
fi

quality=$2
method=6
dir=$(realpath -m "$1")
if [ $# == 3 ]; then
    clean=0
    dir_webp=$(realpath -m "$3")
else
    clean=1
    dir_webp=$(realpath -m "$4")
fi

if [ ! -e "$dir" ]; then
    echo "Not exist: $dir"
    exit -1
fi
dir=$(echo "$dir" | sed -e "s/\/$//")
dir_webp=$(echo "$dir_webp" | sed -e "s/\/$//")

err_no=0
readarray -d '' files < <(find "$dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" \) -print0)
for i in $(seq 0 $[ ${#files[*]} - 1 ]); do
    file="$(echo "${files[$i]}" | sed -e "s/^\.$//" -e "s/^\.\///")"
    sub_file="$(echo ${file#"$(echo "$dir" | sed -e "s/^\/$//g")"} | sed -e "s/^\///g")"
    sub_file="$(echo $sub_file | sed -e "s/^$/$(basename "$file")/g")"
    sub_file_dir="$(dirname "$sub_file" | sed -e "s/^\.$//g")"
    webp_file="$dir_webp/${sub_file%.*}.webp"
    webp_file_dir="$dir_webp/$sub_file_dir"
    if [[ clean -eq 1 || ! -f "$webp_file" ]]; then
        if [ ! -d "$webp_file_dir" ]; then
            mkdir -p "$webp_file_dir"
        fi
        printf "Converting into WebP: $file"
        if [ "$file" != "${file%.gif}" ]; then
            gif2webp -quiet -mixed -q $quality -m $method "$file" -o "$webp_file" 2>/dev/null
            status=$?
        else
            gm convert "$file" -compress webp -quality $quality -define webp:method=$method -auto-orient "$webp_file" 2>/dev/null
            status=$?
        fi
        if [ $status = 0 ]; then
            echo " - OK"
        else
            err_no=$status
            echo " - Failed"
        fi
    fi
done

exit $err_no
