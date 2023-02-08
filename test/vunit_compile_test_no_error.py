from pathlib import Path
from vunit import VUnit

vu = VUnit.from_argv(compile_builtins=False)
for dir in Path(__file__).parent.joinpath('test_files', 'test_no_error').iterdir():
  print("\n\nentering folder: %s"%(dir.absolute()))
  # Create VUnit instance by parsing command line arguments
  libraryname = f'test_{dir.name}'
  if dir.name == 'OSVVM':
    libraryname = 'OSVVM';
  vu.add_library(libraryname)

  vu.add_source_files(dir.absolute() / '[!_]*.vhd', libraryname, vhdl_standard='2008', allow_empty=True)

vu.main()
