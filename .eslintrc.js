module.exports = {
  parser: '@babel/eslint-parser',

  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:promise/recommended',
    'plugin:eslint-comments/recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended'
  ],
  env: {
    browser: true,
    es6: true,
    jest: true
  },
  globals: {
    __nr: true
  },
  parserOptions: {
    requireConfigFile: true,
    babelOptions: {
      configFile: "./.babelrc",
    },
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: [
    'import',
    'promise',
    'eslint-comments',
    'react',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'import/no-unresolved': 'off',
    'no-empty-function': ['error', { allow: ['arrowFunctions'] }],
    'react/react-in-jsx-scope': 'off' 
  }
};
