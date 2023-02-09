library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_procedure_parameter is
end test_procedure_parameter;

architecture arch of test_procedure_parameter is
  procedure foo(par1 : std_ulogic; par2 : integer := 1) is
  begin
    report par;
  end procedure;


begin
  main : process
    procedure foo2(par3 : std_ulogic; par4 : integer := 1) is
    begin
      report par;
    end procedure;

  begin
  end process;
end architecture;
