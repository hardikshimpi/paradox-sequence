"""Append TypeScript level object literals (read from stdin) to a phase file's array."""
import sys
path = sys.argv[1]
body = sys.stdin.read().rstrip()
s = open(path).read().rstrip()
assert s.endswith('];'), 'phase file must end with ];'
open(path, 'w').write(s[:-2] + body + '\n];\n')
