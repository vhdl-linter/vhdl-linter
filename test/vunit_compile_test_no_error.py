from pathlib import Path
from vunit import VUnit

vu = VUnit.from_argv()
for dir in Path(__file__).parent.joinpath("test_files", "test_no_error").iterdir():
    libraryname = f"test_{dir.name}"
    if dir.name == "OSVVM":
        libraryname = "OSVVM"
    print("\n\nentering folder: %s" % (dir.absolute()))
    # Create VUnit instance by parsing command line arguments
    vu.add_library(libraryname)
    filter = "[!_%]*.vhd"
    if vu.get_simulator_name() == "modelsim":
        filter = f"[!$%]*.vhd"
        vu.set_compile_option('modelsim.vcom_flags', ['-vhpreprocess'], True)

    vu.add_source_files(
        dir.absolute() / filter,
        libraryname,
        vhdl_standard="2008",
        allow_empty=True,
    )
    if vu.get_simulator_name() == "modelsim":
        filter = f"[!$%]*.sv"

        vu.add_source_files(
            dir.absolute() / filter,
            libraryname,
            vhdl_standard="2008",
            allow_empty=True,
        )
    print(vu.get_simulator_name())

vu.main()
