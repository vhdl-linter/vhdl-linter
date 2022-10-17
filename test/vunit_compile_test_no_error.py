from pathlib import Path
from vunit import VUnit
print(Path(__file__).parent.joinpath('test_files', 'test_no_error'));

vu = VUnit.from_argv()

for dir in Path(__file__).parent.joinpath('test_files', 'test_no_error').iterdir():
  if (dir.name == 'ieee2008'):
    continue;
  print(dir.absolute)
  # Create VUnit instance by parsing command line arguments

  vu.add_library(f'test_{dir.name}')
  vu.add_source_files(dir.absolute() / '*.vhd', f'test_{dir.name}', vhdl_standard='2008')

vu.main()
