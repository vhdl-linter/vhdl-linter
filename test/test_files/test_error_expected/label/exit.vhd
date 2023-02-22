entity exit is
end exit;

architecture arch of exit is

begin
  a_p : process

  begin
    a : for i_unused in 0 to 10 loop
      exit b; -- wrong label
    end loop;
  end process;

end architecture;
