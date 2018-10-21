library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity Example_For_Loop is
  port (
    i_Clock : std_logic
    );
end Example_For_Loop;

architecture behave of Example_For_Loop is

  signal r_Shift_With_For : std_logic_vector(3 downto 0) := X"1";
  signal r_Shift_Regular  : std_logic_vector(3 downto 0) := X"1";

begin

  -- Creates a Left Shift using a For Loop
  p_Shift_With_For : process (i_Clock)
  begin
    if rising_edge(i_Clock) then
      for ii in 0 to 2 loop
        r_Shift_With_For(ii+1) <= r_Shift_With_For(ii);
      end loop;  -- ii
    end if;
  end process;

  -- Performs a shift left using regular assignments
  p_Shift_Without_For : process (i_Clock)
  begin
    if rising_edge(i_Clock) then
      r_Shift_Regular(1) <= r_Shift_Regular(0);
      r_Shift_Regular(2) <= r_Shift_Regular(1);
      r_Shift_Regular(3) <= r_Shift_Regular(2);
    end if;
  end process;


end behave;
