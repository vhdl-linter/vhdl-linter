from pathlib import Path
from vunit import VUnit

vunit_path = Path(__file__).parent

# Create VUnit instance by parsing command line arguments
vu = VUnit.from_argv()

vu.add_library('test_lib')
vu.add_source_files(vunit_path / '*.vhd', 'test_lib', vhdl_standard='2008')

vu.main()
