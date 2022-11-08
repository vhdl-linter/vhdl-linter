library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_procedure_call is
end entity;

architecture rtl of test_procedure_call is
  signal foo : std_ulogic;
begin
  process
    procedure p(a : in std_ulogic; signal b : out std_ulogic) is
    begin
      b <= a;
    end procedure;
  begin
    p('1', b => foo);  -- vhdl-linter-disable-line instantiation
  end process;

end architecture;
