import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

function chunk(input, name) {
  return {
    input: `dist/esm-browser/${input}.js`,
    output: {
      file: `dist/umd/${name}.min.js`,
      format: 'umd',
      name,
      compact: true,
    },
    plugins: [nodeResolve({ browser: true }), terser()],
  };
}

export default [
  chunk('ssm', 'index')
];