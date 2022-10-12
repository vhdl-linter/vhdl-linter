library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

library vunit_lib;
context vunit_lib.vunit_context;

entity tb_for_vunit is
  generic (
    runner_cfg : string

    );
end entity tb_for_vunit;

architecture behavioural of tb_for_vunit is
begin
  main : process
  begin
    -- the runner variable is injected by vunit
    --vhdl-linter-disable-region
    test_runner_setup(runner, runner_cfg);
    report "Hello world!";
    test_runner_cleanup(runner);
    --vhdl-linter-enable-region
  end process;

end architecture;
