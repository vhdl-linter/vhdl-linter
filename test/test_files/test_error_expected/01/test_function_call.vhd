library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_function_call is
end entity;

architecture rtl of test_function_call is
begin
  process
    function test(data: out std_ulogic) return std_ulogic is
    begin
      data := '1';
      return data;
    end function;

    variable s: std_ulogic; -- s should have 'not reading' warning
    variable x: std_ulogic;
  begin
    x := test(data => s);
    x := x;
  end process;

end architecture;
