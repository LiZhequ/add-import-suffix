# add-import-suffix
为import语句添加完整的后缀

### 安装
```bash
npm i -g add-import-suffix
```

### 用法

在工作目录下打开bash

```bash
# pattern为匹配模式，默认为 "src/**/*.{vue,js}"
# alias为路径别名，以:分隔，如 "@:src"，可传多个，路径为相对于工作目录的路径，alias默认值为 "@:src"
# suffix为后缀名，默认 ".vue"，可传多个
$ add-import-suffix --pattern="src/**/*.{vue,js}" --alias="@:src" --alias="components:src/components" --suffix=".vue"
```
