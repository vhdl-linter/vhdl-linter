from pathlib import Path
from vunit import VUnit
print(Path(__file__).parent.joinpath('test_files', 'test_no_error'));


for dir in Path(__file__).parent.joinpath('test_files', 'test_no_error').iterdir():
  if (dir.name == 'ieee2008'):
    continue;
  # Create VUnit instance by parsing command line arguments
  vu = VUnit.from_argv()

  vu.add_library('test_lib')
  vu.add_source_files(dir.absolute() / '*.vhd', 'test_lib', vhdl_standard='2008')

  vu.main()
