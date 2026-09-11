import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'playgrounds/**',
    '.context/**',
    'ui/**',
  ],
})
  .removeRules(
    'markdown/no-multiple-h1',
  )
  .overrideRules({
    'ts/ban-ts-comment': 'off',
  })
