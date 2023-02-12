library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_else_generate is
end test_else_generate;

architecture arch of test_else_generate is
  type t_state is (idle, working, workingHard, waiting);
  signal state : t_state := idle;
begin

  -----
  --asdsad
  ----
  p_reg : process(all)
  begin
    if true then
    else
      case state is
        when idle =>
          state <= working;
        when working|workingHard =>
          state <= waiting;
        when waiting =>
          state <= idle;
        when others =>
          state <= workingHard;
      end case;
    end if;
  end process;

end arch;
