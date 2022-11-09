from pathlib import Path
from vunit import VUnit

vu = VUnit.from_argv(compile_builtins=False)
for dir in Path(__file__).parent.joinpath('test_files', 'test_no_error').iterdir():
  print("\n\nentering folder: %s"%(dir.absolute()))
  # Create VUnit instance by parsing command line arguments

  vu.add_library(f'test_{dir.name}')
  vu.add_source_files(dir.absolute() / '*.vhd', f'test_{dir.name}', vhdl_standard='2008')

vu.main()
