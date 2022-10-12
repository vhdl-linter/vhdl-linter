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
    test_runner_setup(runner, runner_cfg);
    report "Hello world!";
    test_runner_cleanup(runner); -- Simulation ends here
  end process;

end architecture;
